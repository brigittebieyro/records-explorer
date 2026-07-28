import { render, screen, waitFor } from '@testing-library/react';
import GoalsWeightClass from './GoalsWeightClass';
import { CombinedLiftData, MeetRecord, WeightClass } from '../../Utils/types';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

const makeWeightClass = (overrides: object = {}): WeightClass =>
  ({
    id: 'W48',
    name: "Women's 48kg",
    sport80Id: 709,
    minBodyweight: '0',
    maxBodyweight: '48',
    gender: 'female',
    start: '2025-06-01',
    ...overrides,
  }) as WeightClass;

const makeGoalLifter = (overrides: object = {}): CombinedLiftData =>
  ({
    name: 'Jane Doe',
    total: 180,
    lifter_age: '25',
    lift_date: '2026-01-15',
    club: 'Sacramento Barbell',
    wso: 'Some Other WSO',
    action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/1' }],
    ...overrides,
  }) as unknown as CombinedLiftData;

const makeLifterWithId = (id: string, overrides: object = {}): CombinedLiftData =>
  makeGoalLifter({
    action: [{ url: `https://usaweightlifting.sport80.com/public/rankings/member/${id}` }],
    ...overrides,
  });

// A meet that comfortably satisfies every validation rule for the default weight class/date range.
const makeMeet = (overrides: object = {}): MeetRecord =>
  ({
    date: '2025-12-01',
    total: 180,
    best_snatch: 80,
    'best_c&j': 100,
    'body_weight_(kg)': 47,
    ...overrides,
  }) as MeetRecord;

const renderGoalsWeightClass = (overrides: object = {}) => {
  const props = {
    weightClass: makeWeightClass(),
    safeCount: 2,
    startDate: '2025-07-01',
    endDate: '2026-08-01',
    ...overrides,
  };
  return render(<GoalsWeightClass {...props} />);
};

type IndividualMock = { ok: false } | { ok: true; data: MeetRecord[] };

// Rankings resolve with `rankingsData`. Any athlete not listed in `individualById` is treated
// as "couldn't be verified" (their individual-lookup fetch fails), matching production
// behavior where an unverifiable athlete is assumed valid rather than removed.
const mockFetchResponses = (
  rankingsData: CombinedLiftData[],
  individualById: Record<string, IndividualMock> = {}
) => {
  (global.fetch as jest.Mock).mockImplementation((url: unknown) => {
    const urlStr = String(url);
    if (urlStr.includes('/athletes/')) {
      const id = urlStr.match(/\/athletes\/([^/]+)\//)?.[1] ?? '';
      const entry = individualById[id];
      if (!entry || !entry.ok) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: entry.data }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: rankingsData }) });
  });
};

const waitForVerificationToFinish = async () => {
  await waitFor(() => expect(screen.queryByText('Verifying')).toBeNull());
};

describe('GoalsWeightClass (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('D-02: shows a spinner until the rankings load', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderGoalsWeightClass();

    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    expect(screen.getByText('Fetching')).toBeInTheDocument();
    expect(screen.queryByText(/kg/)).toBeNull();
  });

  test('D-02: renders each entry as soon as the rankings arrive, without waiting on verification', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: unknown) => {
      if (String(url).includes('/athletes/')) return new Promise(() => {}); // verification never resolves
      return Promise.resolve({ ok: true, json: async () => ({ data: [makeGoalLifter()] }) });
    });

    renderGoalsWeightClass();

    await waitFor(() => {
      expect(screen.getByText(/180kg • Jane Doe/)).toBeInTheDocument();
    });
    // The list is visible while a small "Verifying" indicator is still checking each athlete.
    expect(screen.getByText('Verifying')).toBeInTheDocument();
  });

  test('D-02: the "Verifying" indicator disappears once every athlete has been checked', async () => {
    mockFetchResponses([makeGoalLifter()]);

    renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Jane Doe/)).toBeInTheDocument());
    await waitForVerificationToFinish();
    expect(screen.getByText(/180kg • Jane Doe/)).toBeInTheDocument();
  });

  test('D-02: requests rankings for the weight class with safeCount + 5 entries', async () => {
    mockFetchResponses([]);

    renderGoalsWeightClass({ safeCount: 6 });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('l=11'); // safeCount 6 + 5
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.filters.weight_class).toBe(709);
    expect(body.filters.date_range_start).toBe('2025-07-01');
    expect(body.filters.date_range_end).toBe('2026-08-01');
  });

  test('D-03: renders at most safeCount + 3 entries', async () => {
    const lifters = Array.from({ length: 7 }, (_, i) =>
      makeGoalLifter({ name: `Lifter ${i + 1}`, total: 200 - i })
    );
    mockFetchResponses(lifters);

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => expect(screen.getByText(/Lifter 1/)).toBeInTheDocument());
    await waitForVerificationToFinish();
    expect(container.querySelectorAll('.goals-list-item')).toHaveLength(5);
  });

  test('D-04: WSO members are gold-highlighted and show their club', async () => {
    mockFetchResponses([
      makeGoalLifter({
        name: 'Member Lifter',
        wso: 'California North Central',
        club: 'Sacramento Barbell',
      }),
      makeGoalLifter({ name: 'Outside Lifter', wso: 'Pacific Northwest', total: 170 }),
    ]);

    const { container } = renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Member Lifter/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    const memberRow = items.find((item) => item.textContent?.includes('Member Lifter'));
    const outsideRow = items.find((item) => item.textContent?.includes('Outside Lifter'));
    expect(memberRow).toHaveClass('goals-list-highlight');
    expect(memberRow?.textContent).toContain('Sacramento Barbell');
    expect(outsideRow).not.toHaveClass('goals-list-highlight');
    expect(outsideRow?.textContent).toContain('Pacific Northwest');
  });

  test('D-05: entries below the qualifying cutoff are marked tentative', async () => {
    const lifters = Array.from({ length: 4 }, (_, i) =>
      makeGoalLifter({ name: `Lifter ${i + 1}`, total: 200 - i })
    );
    mockFetchResponses(lifters);

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => expect(screen.getByText(/Lifter 1/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items).toHaveLength(4);
    expect(items[0]).not.toHaveClass('goals-item-tentative');
    expect(items[1]).not.toHaveClass('goals-item-tentative');
    expect(items[2]).toHaveClass('goals-item-tentative');
    expect(items[3]).toHaveClass('goals-item-tentative');
    expect(items[2].textContent).toContain('Probable');
    expect(items[0].textContent).not.toContain('Probable');
  });

  test('D-05: WSO member highlighting still applies to tentative rows', async () => {
    mockFetchResponses([
      makeGoalLifter({ name: 'Lifter 1', total: 200 }),
      makeGoalLifter({ name: 'Lifter 2', total: 190 }),
      makeGoalLifter({
        name: 'Probable Member',
        total: 180,
        wso: 'California North Central',
      }),
    ]);

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => expect(screen.getByText(/Probable Member/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items[2]).toHaveClass('goals-item-tentative');
    expect(items[2]).toHaveClass('goals-list-highlight');
  });

  test('D-06: rank circles count 1, 2, 3… in order', async () => {
    const lifters = Array.from({ length: 4 }, (_, i) =>
      makeGoalLifter({ name: `Lifter ${i + 1}`, total: 200 - i })
    );
    mockFetchResponses(lifters);

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => expect(screen.getByText(/Lifter 1/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    const ranks = Array.from(container.querySelectorAll('.goals-rank-circle')).map(
      (node) => node.textContent
    );
    expect(ranks).toEqual(['1', '2', '3', '4']);
  });

  test('G-04: an athlete whose ranking total is backed by a real meet stays on the list unchanged', async () => {
    mockFetchResponses([makeLifterWithId('1', { name: 'Supported Lifter', total: 180 })], {
      '1': { ok: true, data: [makeMeet({ total: 180 })] },
    });

    renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Supported Lifter/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    expect(screen.getByText(/180kg • Supported Lifter/)).toBeInTheDocument();
  });

  test('G-04: an athlete whose ranking total is not directly backed, but a total within 20kg is, gets their total corrected', async () => {
    mockFetchResponses([makeLifterWithId('1', { name: 'Corrected Lifter', total: 180 })], {
      '1': { ok: true, data: [makeMeet({ total: 172 })] },
    });

    renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Corrected Lifter/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    expect(screen.getByText(/172kg • Corrected Lifter/)).toBeInTheDocument();
    expect(screen.queryByText(/180kg • Corrected Lifter/)).toBeNull();
  });

  test('G-04: an athlete with no supporting meet within 20kg is removed, and later athletes move up in rank', async () => {
    mockFetchResponses(
      [
        makeLifterWithId('1', { name: 'Unsupported Lifter', total: 300 }),
        makeLifterWithId('2', { name: 'Next Lifter', total: 250 }),
      ],
      {
        '1': { ok: true, data: [makeMeet({ total: 150 })] }, // nowhere near 300, so unsupported
        '2': { ok: true, data: [makeMeet({ total: 250 })] },
      }
    );

    const { container } = renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Next Lifter/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    expect(screen.queryByText(/Unsupported Lifter/)).toBeNull();
    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items).toHaveLength(1);
    expect(container.querySelector('.goals-rank-circle')?.textContent).toBe('1');
  });

  test('G-04: a total correction that changes the order re-sorts the list', async () => {
    mockFetchResponses(
      [
        makeLifterWithId('1', { name: 'Lifter A', total: 190 }),
        makeLifterWithId('2', { name: 'Lifter B', total: 180 }),
      ],
      {
        '1': { ok: true, data: [makeMeet({ total: 190 })] }, // stays at 190
        '2': { ok: true, data: [makeMeet({ total: 198 })] }, // corrected up past Lifter A
      }
    );

    const { container } = renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Lifter A/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items[0].textContent).toContain('Lifter B');
    expect(items[0].textContent).toContain('198kg');
    expect(items[1].textContent).toContain('Lifter A');
  });

  test('G-04: an athlete whose individual data cannot be pulled is kept and assumed valid', async () => {
    mockFetchResponses([makeLifterWithId('1', { name: 'Unverifiable Lifter', total: 180 })], {
      '1': { ok: false },
    });

    renderGoalsWeightClass();

    await waitFor(() => expect(screen.getByText(/Unverifiable Lifter/)).toBeInTheDocument());
    await waitForVerificationToFinish();

    expect(screen.getByText(/180kg • Unverifiable Lifter/)).toBeInTheDocument();
  });

  test('a failed rankings fetch leaves the spinner without crashing', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('proxy down'));

    renderGoalsWeightClass();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
  });
});
