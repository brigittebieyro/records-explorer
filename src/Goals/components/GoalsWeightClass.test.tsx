import { render, screen, waitFor } from '@testing-library/react';
import GoalsWeightClass from './GoalsWeightClass';
import { CombinedLiftData, WeightClass } from '../../Utils/types';

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
  });

  test('D-02: renders each entry as total • name', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [makeGoalLifter()] }),
    });

    renderGoalsWeightClass();

    await waitFor(() => {
      expect(screen.getByText(/180kg • Jane Doe/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });

  test('D-02: requests rankings for the weight class with safeCount + 5 entries', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: lifters }),
    });

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => {
      expect(container.querySelectorAll('.goals-list-item')).toHaveLength(5);
    });
  });

  test('D-04: WSO members are gold-highlighted and show their club', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          makeGoalLifter({
            name: 'Member Lifter',
            wso: 'California North Central',
            club: 'Sacramento Barbell',
          }),
          makeGoalLifter({ name: 'Outside Lifter', wso: 'Pacific Northwest', total: 170 }),
        ],
      }),
    });

    const { container } = renderGoalsWeightClass();

    await waitFor(() => {
      expect(screen.getByText(/Member Lifter/)).toBeInTheDocument();
    });

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: lifters }),
    });

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => {
      expect(container.querySelectorAll('.goals-list-item')).toHaveLength(4);
    });

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items[0]).not.toHaveClass('goals-item-tentative');
    expect(items[1]).not.toHaveClass('goals-item-tentative');
    expect(items[2]).toHaveClass('goals-item-tentative');
    expect(items[3]).toHaveClass('goals-item-tentative');
    expect(items[2].textContent).toContain('Probable');
    expect(items[0].textContent).not.toContain('Probable');
  });

  test('D-05: WSO member highlighting still applies to tentative rows', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          makeGoalLifter({ name: 'Lifter 1', total: 200 }),
          makeGoalLifter({ name: 'Lifter 2', total: 190 }),
          makeGoalLifter({
            name: 'Probable Member',
            total: 180,
            wso: 'California North Central',
          }),
        ],
      }),
    });

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => {
      expect(screen.getByText(/Probable Member/)).toBeInTheDocument();
    });

    const items = Array.from(container.querySelectorAll('.goals-list-item'));
    expect(items[2]).toHaveClass('goals-item-tentative');
    expect(items[2]).toHaveClass('goals-list-highlight');
  });

  test('D-06: rank circles count 1, 2, 3… in order', async () => {
    const lifters = Array.from({ length: 4 }, (_, i) =>
      makeGoalLifter({ name: `Lifter ${i + 1}`, total: 200 - i })
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: lifters }),
    });

    const { container } = renderGoalsWeightClass({ safeCount: 2 });

    await waitFor(() => {
      expect(container.querySelectorAll('.goals-rank-circle')).toHaveLength(4);
    });

    const ranks = Array.from(container.querySelectorAll('.goals-rank-circle')).map(
      (node) => node.textContent
    );
    expect(ranks).toEqual(['1', '2', '3', '4']);
  });

  test('G-04: implausible lifters are filtered out of the rankings', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          makeGoalLifter({ name: 'Plausible', total: 180 }),
          makeGoalLifter({ name: 'Implausible Total', total: 471 }),
          makeGoalLifter({ name: 'Implausible Snatch', total: 180, best_snatch: 201 }),
        ],
      }),
    });

    renderGoalsWeightClass();

    await waitFor(() => {
      expect(screen.getByText(/Plausible/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Implausible Total/)).toBeNull();
    expect(screen.queryByText(/Implausible Snatch/)).toBeNull();
  });

  test('a failed fetch leaves the spinner without crashing', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('proxy down'));

    renderGoalsWeightClass();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
  });
});
