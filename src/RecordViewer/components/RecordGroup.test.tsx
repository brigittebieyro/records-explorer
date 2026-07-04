import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordGroup from './RecordGroup';
import { AgeGroup, CombinedLiftData, MeetRecord, WeightClass } from '../../Utils/types';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

jest.mock('./RecordHolder', () => (props: { lifterData: { name: string; total: number } }) => (
  <div data-testid="record-holder" data-total={props.lifterData.total}>
    {props.lifterData.name}
  </div>
));

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

const makeAgeGroup = (overrides: object = {}): AgeGroup =>
  ({
    id: 'OPEN',
    name: 'Open',
    usawDisplayKey: 'Open',
    minimum_lifter_age: '0',
    maximum_lifter_age: '1000',
    disabled: false,
    customWeightClasses: false,
    ...overrides,
  }) as AgeGroup;

const makeLifter = (memberId: string, overrides: object = {}): CombinedLiftData =>
  ({
    name: 'Jane Doe',
    total: 180,
    lifter_age: '25',
    lift_date: '2026-01-15',
    club: 'Sacramento Barbell',
    action: [{ url: `https://usaweightlifting.sport80.com/public/rankings/member/${memberId}` }],
    ...overrides,
  }) as unknown as CombinedLiftData;

const makeMeetRecord = (overrides: object = {}): MeetRecord => ({
  date: '2026-01-15',
  total: 180,
  best_snatch: 80,
  'best_c&j': 100,
  'body_weight_(kg)': 47.5,
  meet: 'Sacramento Open',
  ...overrides,
});

// Dispatches the fetch mock: rankings requests get `rankings`, per-lifter
// requests (/athletes/<id>/) get the matching entry from `liftsByMemberId`.
const mockFetchResponses = (
  rankings: CombinedLiftData[],
  liftsByMemberId: Record<string, MeetRecord[]> = {}
) => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    const athleteMatch = String(url).match(/\/athletes\/(\d+)\//);
    const data = athleteMatch ? (liftsByMemberId[athleteMatch[1]] ?? []) : rankings;
    return Promise.resolve({ ok: true, json: async () => ({ data }) });
  });
};

const renderRecordGroup = (overrides: object = {}) => {
  const props = {
    weightClass: makeWeightClass(),
    ageGroup: makeAgeGroup(),
    count: 5,
    startDate: '2025-06-01',
    endDate: '2026-08-01',
    emptyContent: <div>EMPTY MESSAGE</div>,
    ...overrides,
  };
  return render(<RecordGroup {...props} />);
};

describe('RecordGroup (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('B-08: shows a spinner while the rankings load', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderRecordGroup();

    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
  });

  test('B-08: renders ranked lifters once the fetch completes', async () => {
    mockFetchResponses([makeLifter('1'), makeLifter('2', { name: 'Amy Smith', total: 170 })]);

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getAllByTestId('record-holder')).toHaveLength(2);
    });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Amy Smith')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('circle-loader')).toBeNull();
    });
  });

  test('B-08: requests rankings with the weight class, WSO, and age filters', async () => {
    mockFetchResponses([]);

    renderRecordGroup();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('l=7'); // count 5 + 2
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.filters.weight_class).toBe(709);
    expect(body.filters.wso).toBe(21);
    expect(body.filters.date_range_start).toBe('2025-06-01');
    expect(body.filters.date_range_end).toBe('2026-08-01');
    expect(body.filters.minimum_lifter_age).toBe('0');
    expect(body.filters.maximum_lifter_age).toBe('1000');
  });

  test('B-10: renders at most `count` lifters', async () => {
    const lifters = Array.from({ length: 7 }, (_, i) =>
      makeLifter(String(i + 1), { name: `Lifter ${i + 1}`, total: 200 - i })
    );
    mockFetchResponses(lifters);

    renderRecordGroup({ count: 5 });

    await waitFor(() => {
      expect(screen.getAllByTestId('record-holder')).toHaveLength(5);
    });
  });

  test('B-13: the Sort dropdown lists all four sort options once lift data loads', async () => {
    mockFetchResponses([makeLifter('1')], { '1': [makeMeetRecord()] });

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getByLabelText('Sort')).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Overall Total' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Snatch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Clean and Jerk' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Most Recent' })).toBeInTheDocument();
  });

  test('B-13: changing the sort re-orders the lifters', async () => {
    const totalLeader = makeLifter('1', { name: 'Total Leader', total: 180 });
    const snatchLeader = makeLifter('2', { name: 'Snatch Leader', total: 170 });
    mockFetchResponses([totalLeader, snatchLeader], {
      '1': [makeMeetRecord({ total: 180, best_snatch: 70 })],
      '2': [makeMeetRecord({ total: 170, best_snatch: 85 })],
    });

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getByLabelText('Sort')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('record-holder')[0]).toHaveTextContent('Total Leader');
    });

    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'best_snatch');

    await waitFor(() => {
      expect(screen.getAllByTestId('record-holder')[0]).toHaveTextContent('Snatch Leader');
    });
  });

  test('B-14: an empty division renders the empty content and clears the spinner', async () => {
    mockFetchResponses([]);

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.queryByTestId('circle-loader')).toBeNull();
    });
    expect(screen.getByText('EMPTY MESSAGE')).toBeInTheDocument();
    expect(screen.queryByTestId('record-holder')).toBeNull();
  });

  test('G-01: a failed rankings fetch does not crash the component', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('proxy down'));

    renderRecordGroup();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('record-holder')).toBeNull();
  });

  test('G-04: lifters with implausible totals are dropped from the rankings', async () => {
    mockFetchResponses([
      makeLifter('1', { name: 'Plausible Lifter', total: 470 }),
      makeLifter('2', { name: 'Implausible Lifter', total: 560 }),
    ]);

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getByText('Plausible Lifter')).toBeInTheDocument();
    });
    expect(screen.queryByText('Implausible Lifter')).toBeNull();
  });

  test('G-04: ineligible athletes are excluded', async () => {
    mockFetchResponses([
      makeLifter('1', { name: 'Imaginary B. Athlete' }),
      makeLifter('2', { name: 'Real Athlete' }),
    ]);

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getByText('Real Athlete')).toBeInTheDocument();
    });
    expect(screen.queryByText('Imaginary B. Athlete')).toBeNull();
  });

  test('G-04: individual meets over the plausibility caps are excluded from lift data', async () => {
    // The implausible meet has the higher total; if it were included, it would
    // become the displayed result after the lazy lift data replaces rankings.
    mockFetchResponses([makeLifter('1')], {
      '1': [
        makeMeetRecord({ total: 180, best_snatch: 80 }),
        makeMeetRecord({ total: 469, best_snatch: 201, date: '2026-02-01' }),
      ],
    });

    renderRecordGroup();

    await waitFor(() => {
      expect(screen.getByLabelText('Sort')).toBeInTheDocument();
    });
    await waitFor(() => {
      const holders = screen.getAllByTestId('record-holder');
      expect(holders).toHaveLength(1);
      expect(holders[0]).toHaveAttribute('data-total', '180');
    });
  });
});
