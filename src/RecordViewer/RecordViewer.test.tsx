import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import RecordViewer, {
  buildAllCurrentRecords,
  computeHistoricalRecordsForWeightClass,
  computeStandardsForWeightClass,
} from './RecordViewer';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { u13WeightClasses } from '../Data/youthWeightClasses';
import { getAgeGroup } from '../Utils/Utils';
import { AgeGroup, WeightClass } from '../Utils/types';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

jest.mock(
  './components/RecordGroup',
  () => (props: { count: number; startDate: string; emptyContent: React.ReactNode }) => (
    <div data-testid="record-group" data-count={props.count} data-start={props.startDate}>
      {props.emptyContent}
    </div>
  )
);

jest.mock(
  './components/Standards',
  () => (props: { relevantRecords?: { records?: Record<string, unknown> } }) => (
    <div
      data-testid="standards"
      data-has-records={
        !!props.relevantRecords && Object.keys(props.relevantRecords.records ?? {}).length > 0
      }
    />
  )
);

jest.mock('./components/AssociatedPriorRecords', () => () => <div data-testid="prior-records" />);

// Row shape for the Raw_Data sheet (see computeStandardsForWeightClass):
// [2]=age group, [3]=gender, [7]=weight class indicator, [8]=lift, [9]=weight,
// [10]=lifter, [11]=event, [12]=date.
const makeStandardRow = ({
  ageKey = 'Open',
  gender = 'F',
  indicator = '48',
  lift = 'Total',
  weight = '150',
  lifter = 'Jane Doe',
  event = 'Sacramento Open',
  date = '2026-01-15',
} = {}): string[] => [
  '2025-06-01',
  '2026-08-01',
  ageKey,
  gender,
  '',
  '',
  '',
  indicator,
  lift,
  weight,
  lifter,
  event,
  date,
];

// Row shape for the historical sheets (see computeHistoricalRecordsForWeightClass):
// [0]=start, [1]=end, [4]=age group, [5]=gender, [8]=bw min, [9]=bw max,
// [10]=lift, [11]=weight, [12]=lifter, [13]=date, [14]=event.
const makeHistoricalRow = ({
  start = '2018-06-01',
  end = '2025-06-01',
  ageGroup = 'Open',
  gender = 'F',
  bwMin = '40',
  bwMax = '45',
  lift = 'Total',
  weight = '140',
  lifter = 'Jane Doe',
  date = '2019-05-04',
  event = 'Some Open',
} = {}): string[] => [
  start,
  end,
  '',
  '',
  ageGroup,
  gender,
  '0',
  '1000',
  bwMin,
  bwMax,
  lift,
  weight,
  lifter,
  date,
  event,
];

const openWeightClass = defaultWeightClasses[0]; // Women's 48kg

const mockSheetResponses = (standardsRows: string[][], historicalRows: string[][] = []) => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    const values = String(url).includes('Raw_Data') ? standardsRows : historicalRows;
    return Promise.resolve({ ok: true, json: async () => ({ values }) });
  });
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const renderRecordViewer = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RecordViewer />
      <LocationProbe />
    </MemoryRouter>
  );

const runSearch = async (ageGroupId: string, weightClassId: string) => {
  if (ageGroupId !== 'OPEN') {
    await userEvent.selectOptions(screen.getByLabelText('Age Group'), ageGroupId);
  }
  await userEvent.selectOptions(screen.getByLabelText('Weight Class'), weightClassId);
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
};

describe('RecordViewer helpers (user-based)', () => {
  describe('B-03: buildAllCurrentRecords', () => {
    test('excludes STANDARD placeholder lifters from the all-records view', () => {
      const rows = [
        makeStandardRow({ lift: 'Total', lifter: 'Jane Doe' }),
        makeStandardRow({ lift: 'Snatch', lifter: 'STANDARD' }),
      ];

      const entries = buildAllCurrentRecords(rows);

      expect(entries).toHaveLength(1);
      const { records } = entries[0].groups[0];
      expect(records['Total'].lifter).toBe('Jane Doe');
      expect(records['Snatch']).toBeUndefined();
    });

    test('drops weight classes whose only records are STANDARD placeholders', () => {
      const rows = [makeStandardRow({ lifter: 'STANDARD' })];

      expect(buildAllCurrentRecords(rows)).toHaveLength(0);
    });

    test('does not duplicate a youth age group under the default weight class it shares a max-bodyweight indicator with', () => {
      // Default Women's 48kg and U17 Girls 48kg both use indicator '48', but represent
      // different bodyweight brackets (0-48 vs 44.01-48).
      const rows = [
        makeStandardRow({ ageKey: 'Open', indicator: '48', lifter: 'Open Lifter' }),
        makeStandardRow({ ageKey: 'U17', indicator: '48', lifter: 'U17 Lifter' }),
      ];

      const entries = buildAllCurrentRecords(rows);

      const entriesWithU17 = entries.filter((entry) =>
        entry.groups.some((group) => group.ageGroup.id === 'U17')
      );
      expect(entriesWithU17).toHaveLength(1);
      expect(entriesWithU17[0].weightClass.minBodyweight).toBe('44.01');

      const defaultEntry = entries.find((entry) => entry.weightClass.minBodyweight === '0');
      expect(defaultEntry?.groups.map((group) => group.ageGroup.id)).toEqual(['OPEN']);
    });
  });

  describe('B-15: computeStandardsForWeightClass', () => {
    test('matches rows by the max-bodyweight indicator and gender', () => {
      const rows = [
        makeStandardRow(),
        makeStandardRow({ gender: 'M', lifter: 'Wrong Gender' }),
        makeStandardRow({ indicator: '53', lifter: 'Wrong Class' }),
      ];

      const result = computeStandardsForWeightClass(openWeightClass, rows);

      expect(result['OPEN'].records['Total'].lifter).toBe('Jane Doe');
      expect(Object.keys(result)).toHaveLength(1);
    });

    test('superheavy classes match the >threshold indicator', () => {
      const superHeavy = {
        ...openWeightClass,
        id: 'W86plus',
        minBodyweight: '86.01',
        maxBodyweight: '1000',
      } as WeightClass;
      const rows = [makeStandardRow({ indicator: '>86', lifter: 'Super Heavy' })];

      const result = computeStandardsForWeightClass(superHeavy, rows);

      expect(result['OPEN'].records['Total'].lifter).toBe('Super Heavy');
    });
  });

  describe('B-16 / B-17: computeHistoricalRecordsForWeightClass', () => {
    const openAgeGroup = getAgeGroup('OPEN') as AgeGroup;

    test('keeps records matching the age group, gender, and overlapping bodyweights', () => {
      const rows = [
        makeHistoricalRow(),
        makeHistoricalRow({ ageGroup: 'JR', lifter: 'Wrong Age Group' }),
        makeHistoricalRow({ gender: 'M', lifter: 'Wrong Gender' }),
        makeHistoricalRow({ bwMin: '80', bwMax: '90', lifter: 'No Overlap' }),
      ];

      const records = computeHistoricalRecordsForWeightClass(openWeightClass, openAgeGroup, rows);

      expect(records).toHaveLength(1);
      expect(records[0].lifter).toBe('Jane Doe');
      expect(records[0].yearSpan).toBe('2018 - 2025');
    });

    test('skips short rows and rows missing a date or event', () => {
      const rows = [
        makeHistoricalRow().slice(0, 10),
        makeHistoricalRow({ date: '' }),
        makeHistoricalRow({ event: '' }),
      ];

      expect(
        computeHistoricalRecordsForWeightClass(openWeightClass, openAgeGroup, rows)
      ).toHaveLength(0);
    });
  });
});

describe('RecordViewer component (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('B-01: shows the all-records loading message before the sheet arrives', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderRecordViewer();

    expect(screen.getByText('Loading current records…')).toBeInTheDocument();
  });

  test('B-01: renders the all-records view once records load', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();

    await waitFor(() => {
      expect(screen.getByText('All Current Record Holders')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  test('B-08: Go renders both record groups, standards, and writes URL params', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);

    await waitFor(() => {
      expect(screen.getByText('Current Top Athletes')).toBeInTheDocument();
    });
    expect(screen.getByText('All time bests from this bodyweight')).toBeInTheDocument();
    expect(screen.getByTestId('standards')).toBeInTheDocument();

    const groups = screen.getAllByTestId('record-group');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('data-count', '5');
    expect(groups[1]).toHaveAttribute('data-count', '12');

    const search = screen.getByTestId('location-search').textContent;
    expect(search).toContain('ageGroup=OPEN');
    expect(search).toContain(`weightClass=${openWeightClass.id}`);
  });

  test('B-14: the top-athletes group receives the friendly empty message', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);

    await waitFor(() => {
      expect(
        screen.getByText("Looks like nobody's competed in this division yet! Could be you?")
      ).toBeInTheDocument();
    });
  });

  test('B-17: the all-time group starts at 1998 for Open', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);

    await waitFor(() => {
      expect(screen.getAllByTestId('record-group')[1]).toHaveAttribute('data-start', '1998-01-01');
    });
  });

  test('B-17: the all-time group starts at 2014 for youth age groups', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();
    await runSearch('U13', u13WeightClasses[0].id);

    await waitFor(() => {
      expect(screen.getAllByTestId('record-group')[1]).toHaveAttribute('data-start', '2014-01-01');
    });
  });

  test('B-07: switching to an incompatible age group clears the weight class', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();

    // Women's 86+kg has no U11 counterpart (W48 exists in both sets as Girls 48kg).
    await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W86plus');
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();

    await userEvent.selectOptions(screen.getByLabelText('Age Group'), 'U11');

    await waitFor(() => {
      expect(screen.getByLabelText('Weight Class')).toHaveValue('');
    });
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  test('B-09: Reset clears the results, URL params, and restores the all-records view', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);
    await waitFor(() => {
      expect(screen.getAllByTestId('record-group')).toHaveLength(2);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(screen.queryAllByTestId('record-group')).toHaveLength(0);
    });
    expect(screen.getByText('All Current Record Holders')).toBeInTheDocument();
    expect(screen.getByTestId('location-search').textContent).toBe('');
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  test('B-18: URL params auto-run the search on load with dropdowns pre-selected', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer(`/?ageGroup=OPEN&weightClass=${openWeightClass.id}`);

    await waitFor(() => {
      expect(screen.getByText('Current Top Athletes')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('record-group')).toHaveLength(2);
    expect(screen.getByLabelText('Weight Class')).toHaveValue(openWeightClass.id);
  });

  test('G-05: bogus URL params are ignored without crashing', async () => {
    mockSheetResponses([makeStandardRow()]);

    renderRecordViewer('/?ageGroup=BOGUS&weightClass=BOGUS');

    await waitFor(() => {
      expect(screen.getByText('All Current Record Holders')).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId('record-group')).toHaveLength(0);
  });

  test('G-02: a failed sheet fetch does not crash and does not show stale/misleading content', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('sheets down'));

    renderRecordViewer();

    await waitFor(() => {
      expect(screen.queryByText('Loading current records…')).toBeNull();
    });
    expect(screen.queryByText('All Current Record Holders')).toBeNull();
  });

  test('B-19: standards render once the sheet loads, even if the selection finishes first', async () => {
    let resolveStandards: (value: {
      ok: boolean;
      json: () => Promise<{ values: string[][] }>;
    }) => void = () => {};
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (String(url).includes('Raw_Data')) {
        return new Promise((resolve) => {
          resolveStandards = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ values: [] }) });
    });

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);

    // The selection has been applied (Go was clicked), but the standards sheet
    // hasn't loaded yet — the results panel must keep showing the loader instead
    // of mounting Standards with no data.
    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('standards')).toBeNull();

    await act(async () => {
      resolveStandards({ ok: true, json: async () => ({ values: [makeStandardRow()] }) });
    });

    await waitFor(() => {
      expect(screen.getByTestId('standards')).toBeInTheDocument();
    });
  });

  test('B-20: standards show the correct record the first time they appear, even when other page data loads faster', async () => {
    // Reproduces a real race: prior-record history is 3 small sheets that
    // often resolve before the single, larger current-standards sheet. The
    // instant standards first become visible, they must already carry the
    // right record — never an empty/stale placeholder that requires
    // reselecting the same weight class to fix.
    let resolveStandards: (value: {
      ok: boolean;
      json: () => Promise<{ values: string[][] }>;
    }) => void = () => {};
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (String(url).includes('Raw_Data')) {
        return new Promise((resolve) => {
          resolveStandards = resolve;
        });
      }
      // Prior-record history resolves immediately, well before standards.
      return Promise.resolve({ ok: true, json: async () => ({ values: [] }) });
    });

    renderRecordViewer();
    await runSearch('OPEN', openWeightClass.id);

    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('standards')).toBeNull();

    await act(async () => {
      resolveStandards({ ok: true, json: async () => ({ values: [makeStandardRow()] }) });
    });

    await waitFor(() => {
      expect(screen.getByTestId('standards')).toBeInTheDocument();
    });
    expect(screen.getByTestId('standards')).toHaveAttribute('data-has-records', 'true');
  });
});
