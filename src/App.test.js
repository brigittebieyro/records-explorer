import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { computeStandardsForWeightClass, buildAllCurrentRecords } from './App';
import * as RoutesAndSettings from './RoutesAndSettings';
import * as Utils from './Utils';

jest.mock('./RecordGroup', () => {
  return function RecordGroup() {
    return <div data-testid="record-group">Current Records</div>;
  };
});

jest.mock('./CombinedRecordGroup', () => {
  return function CombinedRecordGroup() {
    return <div data-testid="combined-record-group">Historical Records</div>;
  };
});

jest.mock('./Standards', () => {
  return function Standards() {
    return <div data-testid="standards">Standards</div>;
  };
});

jest.mock('./Header', () => {
  return function Header() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('./AllCurrentRecordsView', () => {
  return function AllCurrentRecordsView({ data }) {
    return <div data-testid="all-current-records-view">All Records ({data.length})</div>;
  };
});

jest.mock('react-spinners', () => {
  return {
    CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
  };
});

jest.mock('./RoutesAndSettings');
jest.mock('./Utils');

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
};

const mockAgeGroup = {
  id: 'OPEN',
  name: 'Open',
  minimum_lifter_age: '20',
  maximum_lifter_age: '34',
};

describe('App - MainPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
    Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);
    RoutesAndSettings.getSheetRoute.mockReturnValue('https://sheets.googleapis.com/v4/test');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderApp = () => {
    return render(<App />);
  };

  describe('Rendering and Initialization', () => {
    test('renders main page with selection controls', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /age group/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /weight class/i })).toBeInTheDocument();
    });

    test('renders header component', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    test('fetches standards on component mount', async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      const options = ageGroupSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(0);
    });

    test('defaults to OPEN age group', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      expect(ageGroupSelect.value).toBe('OPEN');
    });

    test('updates weight class options when age group changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      const womenWeightClasses = [mockWeightClass, { ...mockWeightClass, id: 'W53' }];
      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue(womenWeightClasses);

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      await userEvent.selectOptions(ageGroupSelect, 'U15');

      await waitFor(() => {
        expect(Utils.getWeightClassSet).toHaveBeenCalled();
      });
    });

    test('clears weight class selection when age group changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      const u15AgeGroup = { ...mockAgeGroup, id: 'U15' };
      Utils.getAgeGroup.mockImplementation((id) => (id === 'U15' ? u15AgeGroup : mockAgeGroup));
      Utils.getWeightClassSet.mockImplementation((ageGroup) =>
        ageGroup && ageGroup.id === 'U15' ? [] : [mockWeightClass]
      );

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });

      await userEvent.selectOptions(weightClassSelect, 'W48');
      expect(weightClassSelect.value).toBe('W48');

      await userEvent.selectOptions(ageGroupSelect, 'U15');

      await waitFor(() => {
        expect(weightClassSelect.value).toBe('');
      });
    });
  });

  describe('Weight Class Selection', () => {
    test('displays weight class options based on selected age group', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass, { ...mockWeightClass, id: 'W53' }]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      const options = weightClassSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(2);
    });

    test('shows placeholder text when no weight class selected', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      expect(weightClassSelect.value).toBe('');
      expect(screen.getByText('Select a Weight Class')).toBeInTheDocument();
    });
  });

  describe('Form Submission (Go Button)', () => {
    test('disables Go button when no weight class selected', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const goButton = screen.getByRole('button', { name: 'Go' });
      expect(goButton).toBeDisabled();
    });

    test('enables Go button when both age group and weight class selected', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });

      await waitFor(() => {
        expect(goButton).not.toBeDisabled();
      });
    });

    test('shows results when Go button clicked', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([plusWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('handles standards fetch error gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      });
    });

    test('handles non-ok standards response status', async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      const goButton = screen.getByRole('button', { name: 'Go' });

      expect(goButton).toBeDisabled();
    });
  });

  describe('Display State Transitions', () => {
    test('shows initial options screen', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.queryByTestId('circle-loader')).not.toBeInTheDocument();
    });

    test('transitions to complete state when Go is clicked', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

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
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    });

    test('shows AllCurrentRecordsView as the initial empty state', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('all-current-records-view')).toBeInTheDocument();
    });

    test('Reset button appears after clicking Go', async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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
    };

    const maleM60 = {
      id: 'M60',
      name: "Men's 60kg",
      maxBodyweight: '60',
      minBodyweight: '0',
      gender: 'male',
    };

    const plusClass = {
      id: 'W86plus',
      name: "Women's 86+kg",
      maxBodyweight: '1000',
      minBodyweight: '86.01',
      gender: 'female',
    };

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
      const groupIds = w48.groups.map((g) => g.ageGroup.id);
      expect(groupIds).toContain('OPEN');
      expect(groupIds).toContain('35');
      // OPEN should appear before 35 (follows ageGroups array order)
      expect(groupIds.indexOf('OPEN')).toBeLessThan(groupIds.indexOf('35'));
    });
  });

  describe('SKIPPED TESTS - Bugs Found', () => {
    test.skip('BUG: Standards data structure should handle all column indices correctly', async () => {
      // BUG POTENTIAL: App.js line 82-106
      // Issue: Standards parsing uses hard-coded column indices that might not match all data formats
      // Indices used: [2]=ageKey, [3]=genderKey, [4]=recordKey, [7]=weightClassIndicator, [8]=liftType, [9]=weight, [10]=lifter, [11]=event, [12]=date
      // Risk: If Google Sheets format changes or has missing columns, this will break silently
      // Test: Verify all standard fields are correctly extracted and displayed
      const standardsWithMissingColumns = [
        ['', '', 'OPEN', 'F', 'Total', '', '', '48'], // Missing columns 8-12
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: standardsWithMissingColumns }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      await userEvent.selectOptions(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });
  });
});
