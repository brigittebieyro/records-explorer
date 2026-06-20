import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import {
  buildAllCurrentRecords,
  computeHistoricalRecordsForWeightClass,
  computeStandardsForWeightClass,
} from './RecordViewer/RecordViewer';
import * as RoutesAndSettings from './Data/RoutesAndSettings';
import * as Utils from './Utils/Utils';
import { AgeGroup, WeightClass } from './Utils/types';

jest.mock('./RecordViewer/components/RecordGroup', () => {
  return function RecordGroup() {
    return <div data-testid="record-group">Current Records</div>;
  };
});

jest.mock('./RecordViewer/components/Standards', () => {
  return function Standards() {
    return <div data-testid="standards">Standards</div>;
  };
});

jest.mock('./Header/Header', () => {
  return function Header() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('./RecordViewer/components/AllCurrentRecordsView', () => {
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
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderApp = () => {
    return render(<App />);
  };

  describe('Rendering and Initialization', () => {
    test('renders main page with selection controls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /age group/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /weight class/i })).toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test('renders header component', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('header')).toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
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
    test('populates age group options from ageGroups data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      const options = ageGroupSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThan(0);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test('defaults to OPEN age group', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const ageGroupSelect = screen.getByRole('combobox', { name: /age group/i });
      expect((ageGroupSelect as HTMLSelectElement).value).toBe('OPEN');
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
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
    test('displays weight class options based on selected age group', async () => {
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
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test('shows placeholder text when no weight class selected', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const weightClassSelect = screen.getByRole('combobox', { name: /weight class/i });
      expect((weightClassSelect as HTMLSelectElement).value).toBe('');
      expect(screen.getByText('Select a Weight Class')).toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
  });

  describe('Form Submission (Go Button)', () => {
    test('disables Go button when no weight class selected', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      const goButton = screen.getByRole('button', { name: 'Go' });
      expect(goButton).toBeDisabled();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
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
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
  });

  describe('Display State Transitions', () => {
    test('shows initial options screen', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.queryByTestId('circle-loader')).not.toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
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
    test('Reset button is not visible in the initial empty state', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test('shows AllCurrentRecordsView as the initial empty state', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByTestId('all-current-records-view')).toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
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

    test('includes U11 youth lifter (Elenor Cler) in results', () => {
      const standards = [
        [
          '',
          '',
          'U11',
          'F',
          'U11',
          '',
          '',
          '30',
          'Total',
          '80',
          'Elenor Cler',
          'Youth Meet',
          '2025-06-15',
        ],
      ];
      const result = buildAllCurrentRecords(standards);
      const u11entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U11'
      );
      expect(u11entry).toBeDefined();
      expect(u11entry!.weightClass.maxBodyweight).toBe('30');
      expect(u11entry!.weightClass.gender).toBe('female');
      expect(u11entry!.groups[0].records['Total'].lifter).toBe('Elenor Cler');
    });

    test('includes U13 youth lifter (Liam Doherty) in results', () => {
      const standards = [
        [
          '',
          '',
          'U13',
          'M',
          'U13',
          '',
          '',
          '40',
          'Total',
          '110',
          'Liam Doherty',
          'Youth Meet',
          '2025-07-10',
        ],
      ];
      const result = buildAllCurrentRecords(standards);
      const u13entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U13'
      );
      expect(u13entry).toBeDefined();
      expect(u13entry!.weightClass.maxBodyweight).toBe('40');
      expect(u13entry!.weightClass.gender).toBe('male');
      expect(u13entry!.groups[0].records['Total'].lifter).toBe('Liam Doherty');
    });

    test('includes U15 and U17 youth lifters in results', () => {
      // Use weight class indicators that exist in U15/U17 sets (U15 female: W44, U17 male: M56)
      const standards = [
        [
          '',
          '',
          'U15',
          'F',
          'U15',
          '',
          '',
          '44',
          'Snatch',
          '75',
          'Alice',
          'Youth Meet',
          '2025-08-01',
        ],
        [
          '',
          '',
          'U17',
          'M',
          'U17',
          '',
          '',
          '56',
          'Total',
          '185',
          'Bob',
          'Youth Meet',
          '2025-08-01',
        ],
      ];
      const result = buildAllCurrentRecords(standards);

      const u15entry = result.find(
        (r) =>
          r.groups.length === 1 &&
          r.groups[0].ageGroup.id === 'U15' &&
          r.weightClass.gender === 'female'
      );
      expect(u15entry).toBeDefined();
      expect(u15entry!.groups[0].records['Snatch'].lifter).toBe('Alice');

      const u17entry = result.find(
        (r) =>
          r.groups.length === 1 &&
          r.groups[0].ageGroup.id === 'U17' &&
          r.weightClass.gender === 'male'
      );
      expect(u17entry).toBeDefined();
      expect(u17entry!.groups[0].records['Total'].lifter).toBe('Bob');
    });

    test('excludes STANDARD entries from youth weight classes', () => {
      const standards = [
        ['', '', 'U11', 'F', 'U11', '', '', '30', 'Total', '70', 'STANDARD', '', ''],
      ];
      const result = buildAllCurrentRecords(standards);
      const u11entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U11'
      );
      expect(u11entry).toBeUndefined();
    });

    test('youth records are scoped to their age group — no cross-contamination with Open', () => {
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
          '225',
          'Jane Open',
          'Meet',
          '2024-01-01',
        ],
        [
          '',
          '',
          'U13',
          'F',
          'U13',
          '',
          '',
          '36',
          'Total',
          '95',
          'Jane Youth',
          'Youth Meet',
          '2025-06-15',
        ],
      ];
      const result = buildAllCurrentRecords(standards);

      // The Open W48 entry should not include any U13 age group rows
      const openW48 = result.find(
        (r) => r.weightClass.id === 'W48' && r.groups.some((g) => g.ageGroup.id === 'OPEN')
      );
      expect(openW48).toBeDefined();
      expect(openW48!.groups.every((g) => g.ageGroup.id !== 'U13')).toBe(true);

      // The U13 entry should have exactly one group and it must not be OPEN
      const u13entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U13'
      );
      expect(u13entry).toBeDefined();
      expect(u13entry!.groups[0].records['Total'].lifter).toBe('Jane Youth');
    });

    test('each youth age group gets its own entry even when sharing a weight class indicator', () => {
      // U11 and U13 both have a Girls 30kg class (indicator '30')
      const standards = [
        [
          '',
          '',
          'U11',
          'F',
          'U11',
          '',
          '',
          '30',
          'Total',
          '65',
          'U11 Girl',
          'Youth Meet',
          '2025-06-15',
        ],
        [
          '',
          '',
          'U13',
          'F',
          'U13',
          '',
          '',
          '30',
          'Total',
          '80',
          'U13 Girl',
          'Youth Meet',
          '2025-06-15',
        ],
      ];
      const result = buildAllCurrentRecords(standards);

      const u11entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U11'
      );
      const u13entry = result.find(
        (r) => r.groups.length === 1 && r.groups[0].ageGroup.id === 'U13'
      );

      expect(u11entry).toBeDefined();
      expect(u11entry!.groups[0].records['Total'].lifter).toBe('U11 Girl');

      expect(u13entry).toBeDefined();
      expect(u13entry!.groups[0].records['Total'].lifter).toBe('U13 Girl');
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

  describe('computeHistoricalRecordsForWeightClass (pure helper)', () => {
    const femaleW48 = {
      id: 'W48',
      name: "Women's 48kg",
      maxBodyweight: '48',
      minBodyweight: '0',
      gender: 'female',
      start: '2025-06-01',
    } as unknown as WeightClass;

    const openAgeGroup = {
      id: 'OPEN',
      name: 'Open',
      minimum_lifter_age: '15',
      maximum_lifter_age: '999',
    } as unknown as AgeGroup;

    const makeRow = (overrides: Partial<Record<number, string>> = {}): string[] => {
      const base: string[] = [
        '2018-01-01', // [0] period start
        '2025-06-01', // [1] period end
        '', // [2]
        '', // [3]
        'open', // [4] age group
        'F', // [5] gender
        '15', // [6] min age
        '999', // [7] max age
        '36', // [8] body weight min
        '48', // [9] body weight max
        'Total', // [10] lift
        '210', // [11] weight
        'Jane Smith', // [12] lifter
        '2022-03-15', // [13] date
        'Nationals', // [14] event
      ];
      Object.entries(overrides).forEach(([i, v]) => {
        if (v !== undefined) base[parseInt(i)] = v;
      });
      return base;
    };

    test('returns empty array when historicalData is empty', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, []);
      expect(result).toEqual([]);
    });

    test('skips rows with fewer than 14 elements', () => {
      const shortRow = ['2018-01-01', '2025-06-01', '', '', 'open', 'F'];
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [shortRow]);
      expect(result).toHaveLength(0);
    });

    test('skips rows where date (row[13]) is missing', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 13: '' }),
      ]);
      expect(result).toHaveLength(0);
    });

    test('skips rows where event (row[14]) is missing', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 14: '' }),
      ]);
      expect(result).toHaveLength(0);
    });

    test('filters out records that do not match the age group', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 4: 'masters' }),
      ]);
      expect(result).toHaveLength(0);
    });

    test('matches age group case-insensitively (row[4] is uppercased)', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 4: 'open' }),
      ]);
      expect(result).toHaveLength(1);
    });

    test('filters out records where gender does not match the weight class', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 5: 'M' }),
      ]);
      expect(result).toHaveLength(0);
    });

    test('includes a record whose weight class range overlaps with the current class', () => {
      // historical class 36–48kg overlaps with current 0–48kg
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [makeRow()]);
      expect(result).toHaveLength(1);
    });

    test('excludes a record whose weight class range is entirely above the current class', () => {
      // historical class 49–59kg does not overlap with 0–48kg
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [
        makeRow({ 8: '49', 9: '59' }),
      ]);
      expect(result).toHaveLength(0);
    });

    test('populates all PriorRecord fields correctly', () => {
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, [makeRow()]);
      expect(result[0]).toMatchObject({
        ageGroup: 'OPEN',
        gender: 'female',
        ageMin: 15,
        ageMax: 999,
        bodyWeightMin: 36,
        bodyWeightMax: 48,
        lift: 'Total',
        weight: '210',
        lifter: 'Jane Smith',
        date: '2022-03-15',
        event: 'Nationals',
        yearSpan: `${new Date('2018-01-01').getFullYear()} - ${new Date('2025-06-01').getFullYear()}`,
      });
    });

    test('includes multiple matching records', () => {
      const rows = [
        makeRow({ 10: 'Total', 12: 'Jane Smith' }),
        makeRow({ 10: 'Snatch', 12: 'Joan Lee' }),
      ];
      const result = computeHistoricalRecordsForWeightClass(femaleW48, openAgeGroup, rows);
      expect(result).toHaveLength(2);
    });
  });
});
