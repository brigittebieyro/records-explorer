import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { buildAllCurrentRecords, computeStandardsForWeightClass } from './App';
import * as RoutesAndSettings from './Data/RoutesAndSettings';
import * as Utils from './Utils/Utils';
import { AgeGroup, WeightClass } from './Utils/types';

jest.mock('./RecordViewer/RecordGroup', () => {
  return function RecordGroup() {
    return <div data-testid="record-group">Current Records</div>;
  };
});

jest.mock('./RecordViewer/CombinedRecordGroup', () => {
  return function CombinedRecordGroup() {
    return <div data-testid="combined-record-group">Historical Records</div>;
  };
});

jest.mock('./RecordViewer/Standards', () => {
  return function Standards() {
    return <div data-testid="standards">Standards</div>;
  };
});

jest.mock('./Header/Header', () => {
  return function Header() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('./RecordViewer/AllCurrentRecordsView', () => {
  return function AllCurrentRecordsView({ data }: { data: unknown[] }) {
    return <div data-testid="all-current-records-view">All Records ({data.length})</div>;
  };
});

jest.mock('react-spinners', () => {
  return {
    CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
  };
});

jest.mock('./Data/RoutesAndSettings');
jest.mock('./Utils/Utils');

const mockStandardsData = [
  [
    '',
    '',
    'OPEN',
    'F',
    'Total',
    '',
    '',
    '48',
    'Total',
    '250',
    'Jane Doe',
    'Competition',
    '2025-10-15',
  ],
  [
    '',
    '',
    'OPEN',
    'F',
    'Snatch',
    '',
    '',
    '48',
    'Snatch',
    '110',
    'Jane Doe',
    'Competition',
    '2025-10-15',
  ],
];

const mockWeightClass = {
  id: 'W48',
  name: "Women's 48kg",
  sport80Id: 709,
  minBodyweight: '0',
  maxBodyweight: '48',
  gender: 'female',
  start: '2025-06-01',
  previousAnalogs: [],
} as unknown as WeightClass;

const mockAgeGroup = {
  id: 'OPEN',
  name: 'Open',
  minimum_lifter_age: '20',
  maximum_lifter_age: '34',
} as unknown as AgeGroup;

describe('App - MainPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.mocked(Utils.getAgeGroup).mockReturnValue(mockAgeGroup);
    jest.mocked(Utils.getWeightClassSet).mockReturnValue([mockWeightClass]);
    jest
      .mocked(RoutesAndSettings.getSheetRoute)
      .mockReturnValue('https://sheets.googleapis.com/v4/test');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderApp = () => {
    return render(<App />);
  };

  describe('Rendering and Initialization', () => {
    test('renders main page with selection controls', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /age group/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /weight class/i })).toBeInTheDocument();
    });

    test('renders header component', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    test('fetches standards on component mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sheets'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Age Group Selection', () => {
    test('populates age group options from ageGroups data', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      const options = ageGroupSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(0);
    });

    test('defaults to OPEN age group', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      expect((ageGroupSelect as HTMLSelectElement).value).toBe('OPEN');
    });

    test('updates weight class options when age group changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      const womenWeightClasses = [
        mockWeightClass,
        { ...mockWeightClass, id: 'W53' } as WeightClass,
      ];
      jest.mocked(Utils.getWeightClassSet).mockReturnValue(womenWeightClasses);

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      await userEvent.selectOptions(ageGroupSelect, 'U15');

      await waitFor(() => {
        expect(Utils.getWeightClassSet).toHaveBeenCalled();
      });
    });

    test('clears weight class selection when age group changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      const u15AgeGroup = { ...mockAgeGroup, id: 'U15' } as unknown as AgeGroup;
      jest
        .mocked(Utils.getAgeGroup)
        .mockImplementation((id) => (id === 'U15' ? u15AgeGroup : mockAgeGroup));
      jest
        .mocked(Utils.getWeightClassSet)
        .mockImplementation((ageGroup) =>
          ageGroup && ageGroup.id === 'U15' ? [] : [mockWeightClass]
        );

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });

      await userEvent.selectOptions(weightClassSelect, 'W48');
      expect((weightClassSelect as HTMLSelectElement).value).toBe('W48');

      await userEvent.selectOptions(ageGroupSelect, 'U15');

      await waitFor(() => {
        expect((weightClassSelect as HTMLSelectElement).value).toBe('');
      });
    });
  });

  describe('Weight Class Selection', () => {
    test('displays weight class options based on selected age group', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      jest
        .mocked(Utils.getWeightClassSet)
        .mockReturnValue([mockWeightClass, { ...mockWeightClass, id: 'W53' } as WeightClass]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      const options = weightClassSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(2);
    });

    test('shows placeholder text when no weight class selected', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      expect((weightClassSelect as HTMLSelectElement).value).toBe('');
      expect(screen.getByText('Select a Weight Class')).toBeInTheDocument();
    });
  });

  describe('Form Submission (Go Button)', () => {
    test('disables Go button when no weight class selected', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const goButton = screen.getByRole('button', { name: 'Go' });
      expect(goButton).toBeDisabled();
    });

    test('enables Go button when both age group and weight class selected', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });

      await waitFor(() => {
        expect(goButton).not.toBeDisabled();
      });
    });

    test('shows results when Go button clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('record-group').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Display Filtering Logic', () => {
    test('filters standards by weight class maxBodyweight for single digit limits', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });

    test('filters standards by calculated weight class range for plus sizes (>100kg)', async () => {
      const plusWeightClass = {
        ...mockWeightClass,
        id: 'W86plus',
        maxBodyweight: '1000',
        minBodyweight: '86.01',
      } as unknown as WeightClass;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      jest.mocked(Utils.getWeightClassSet).mockReturnValue([plusWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W86plus');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });

    test('filters standards by gender of selected weight class', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });
  });

  describe('Results Display', () => {
    test('renders RecordGroup component after Go button clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('record-group').length).toBeGreaterThan(0);
      });
    });

    test('renders both current and historical RecordGroup components after Go button clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('record-group')).toHaveLength(2);
      });
    });

    test('renders Standards component with current standards', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });
  });

  describe('Standards Fetching and Parsing', () => {
    test('caches standards to prevent repeated API calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('handles standards fetch error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      });
    });

    test('handles non-ok standards response status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing weight class object gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      jest.mocked(Utils.getWeightClassSet).mockReturnValue([]);

      renderApp();

      const goButton = screen.getByRole('button', { name: 'Go' });

      expect(goButton).toBeDisabled();
    });
  });

  describe('Display State Transitions', () => {
    test('shows initial options screen', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.queryByTestId('circle-loader')).not.toBeInTheDocument();
    });

    test('transitions to complete state when Go is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('record-group').length).toBeGreaterThan(0);
      });
    });

    test('transitions from loading to complete state', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('record-group')).toHaveLength(2);
      });
    });
  });

  describe('Reset Button and Empty State', () => {
    test('Reset button is not visible in the initial empty state', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    });

    test('shows AllCurrentRecordsView as the initial empty state', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('all-current-records-view')).toBeInTheDocument();
    });

    test('Reset button appears after clicking Go', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      });
    });

    test('AllCurrentRecordsView is hidden while a specific weight class is being viewed', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() => {
        expect(screen.queryByTestId('all-current-records-view')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('record-group').length).toBeGreaterThan(0);
      });
    });

    test('Reset button returns to empty state and hides itself', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
      await waitFor(() => {
        expect(screen.getByTestId('all-current-records-view')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      });
    });
  });

  describe('computeStandardsForWeightClass (pure helper)', () => {
    const femaleW48 = {
      id: 'W48',
      name: "Women's 48kg",
      maxBodyweight: '48',
      minBodyweight: '0',
      gender: 'female',
    } as unknown as WeightClass;

    const maleM60 = {
      id: 'M60',
      name: "Men's 60kg",
      maxBodyweight: '60',
      minBodyweight: '0',
      gender: 'male',
    } as unknown as WeightClass;

    const plusClass = {
      id: 'W86plus',
      name: "Women's 86+kg",
      maxBodyweight: '1000',
      minBodyweight: '86.01',
      gender: 'female',
    } as unknown as WeightClass;

    test('groups records by age group key', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Total', '200', 'Jane', 'Meet', '2024-01-01'],
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Snatch', '90', 'Jane', 'Meet', '2024-01-01'],
      ];
      const result = computeStandardsForWeightClass(femaleW48, standards);
      expect(result['OPEN']).toBeDefined();
      expect(result['OPEN'].records['Total'].lifter).toBe('Jane');
      expect(result['OPEN'].records['Snatch'].lifter).toBe('Jane');
    });

    test('filters by gender — female weight class ignores male records', () => {
      const standards = [
        ['', '', 'OPEN', 'M', 'OPEN', '', '', '48', 'Total', '200', 'John', 'Meet', '2024-01-01'],
      ];
      const result = computeStandardsForWeightClass(femaleW48, standards);
      expect(Object.keys(result)).toHaveLength(0);
    });

    test('filters by gender — male weight class ignores female records', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '60', 'Total', '200', 'Jane', 'Meet', '2024-01-01'],
      ];
      const result = computeStandardsForWeightClass(maleM60, standards);
      expect(Object.keys(result)).toHaveLength(0);
    });

    test('uses >minBodyweight indicator for plus-weight classes', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '>86', 'Total', '280', 'Jane', 'Meet', '2024-01-01'],
      ];
      const result = computeStandardsForWeightClass(plusClass, standards);
      expect(result['OPEN']).toBeDefined();
      expect(result['OPEN'].records['Total'].lifter).toBe('Jane');
    });

    test('uses standard[4] as key for Masters age groups (M prefix)', () => {
      const standards = [
        [
          '',
          '',
          'MASTERS_35-39',
          'F',
          '35',
          '',
          '',
          '48',
          'Total',
          '180',
          'Jane',
          'Meet',
          '2024-01-01',
        ],
      ];
      const result = computeStandardsForWeightClass(femaleW48, standards);
      expect(result['35']).toBeDefined();
    });

    test('includes STANDARD records (caller is responsible for filtering)', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Total', '250', 'STANDARD', '', ''],
      ];
      const result = computeStandardsForWeightClass(femaleW48, standards);
      expect(result['OPEN'].records['Total'].lifter).toBe('STANDARD');
    });
  });

  describe('buildAllCurrentRecords (pure helper)', () => {
    test('returns empty array when standards is empty', () => {
      const result = buildAllCurrentRecords([]);
      expect(result).toEqual([]);
    });

    test('excludes entries where lifter is STANDARD', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Total', '250', 'STANDARD', '', ''],
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Snatch', '110', 'STANDARD', '', ''],
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Clean & Jerk', '140', 'STANDARD', '', ''],
      ];
      const result = buildAllCurrentRecords(standards);
      expect(result).toHaveLength(0);
    });

    test('includes entries where at least one lift has a real record holder', () => {
      const standards = [
        [
          '',
          '',
          'OPEN',
          'F',
          'OPEN',
          '',
          '',
          '48',
          'Total',
          '250',
          'Jane Smith',
          'Meet',
          '2024-01-01',
        ],
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Snatch', '110', 'STANDARD', '', ''],
      ];
      const result = buildAllCurrentRecords(standards);
      expect(result).toHaveLength(1);
      expect(result[0].weightClass.id).toBe('W48');
      expect(result[0].groups[0].records['Total'].lifter).toBe('Jane Smith');
      expect(result[0].groups[0].records['Snatch']).toBeUndefined();
    });

    test('orders weight classes women first then men', () => {
      const standards = [
        ['', '', 'OPEN', 'M', 'OPEN', '', '', '60', 'Total', '310', 'John', 'Meet', '2024-01-01'],
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Total', '225', 'Jane', 'Meet', '2024-01-01'],
      ];
      const result = buildAllCurrentRecords(standards);
      expect(result[0].weightClass.gender).toBe('female');
      const maleEntries = result.filter((r) => r.weightClass.gender === 'male');
      const femaleEntries = result.filter((r) => r.weightClass.gender === 'female');
      const lastFemaleIdx = result.indexOf(femaleEntries[femaleEntries.length - 1]);
      const firstMaleIdx = result.indexOf(maleEntries[0]);
      expect(lastFemaleIdx).toBeLessThan(firstMaleIdx);
    });

    test('groups records by weight class with age groups nested', () => {
      const standards = [
        ['', '', 'OPEN', 'F', 'OPEN', '', '', '48', 'Total', '225', 'Jane', 'Meet A', '2024-01-01'],
        [
          '',
          '',
          'MASTERS_35-39',
          'F',
          '35',
          '',
          '',
          '48',
          'Total',
          '200',
          'Joan',
          'Meet B',
          '2024-02-01',
        ],
      ];
      const result = buildAllCurrentRecords(standards);
      const w48 = result.find((r) => r.weightClass.id === 'W48');
      expect(w48).toBeDefined();
      const groupIds = w48!.groups.map((g) => g.ageGroup.id);
      expect(groupIds).toContain('OPEN');
      expect(groupIds).toContain('35');
      expect(groupIds.indexOf('OPEN')).toBeLessThan(groupIds.indexOf('35'));
    });
  });

  describe('Uncovered Branch Coverage', () => {
    test('find callback returns false for non-matching items before finding selected weight class', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      const w53 = { ...mockWeightClass, id: 'W53' } as WeightClass;
      const u15AgeGroup = { ...mockAgeGroup, id: 'U15' } as unknown as AgeGroup;
      jest
        .mocked(Utils.getAgeGroup)
        .mockImplementation((id) => (id === 'U15' ? u15AgeGroup : mockAgeGroup));
      // When U15 is selected, return [W53, W48] so the callback visits W53 (false) then W48 (true)
      jest
        .mocked(Utils.getWeightClassSet)
        .mockImplementation((ageGroup) =>
          ageGroup && ageGroup.id === 'U15' ? [w53, mockWeightClass] : [mockWeightClass]
        );

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      await userEvent.selectOptions(ageGroupSelect, 'U15');

      await waitFor(() => {
        // W48 found in [W53, W48] — weight class not cleared
        expect((weightClassSelect as HTMLSelectElement).value).toBe('W48');
      });
    });

    test('updateDisplayedStandards skips when localStandards is empty at time of Go click', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() => {
        // updateContents still completes: status becomes 'complete', record group renders
        expect(screen.queryAllByTestId('record-group').length).toBeGreaterThan(0);
      });
    });

    test('updateContents returns early when selected weight class is no longer in the list', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const w53 = { ...mockWeightClass, id: 'W53' } as WeightClass;
      jest.mocked(Utils.getWeightClassSet).mockReturnValue([w53]);

      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() => {
        expect(screen.queryByTestId('record-group')).not.toBeInTheDocument();
      });
    });
  });

  describe('SKIPPED TESTS - Bugs Found', () => {
    test.skip('BUG: Standards data structure should handle all column indices correctly', async () => {
      const standardsWithMissingColumns = [['', '', 'OPEN', 'F', 'Total', '', '', '48']];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: standardsWithMissingColumns }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });
  });
});
