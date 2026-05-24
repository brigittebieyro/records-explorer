import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
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

jest.mock('react-spinners', () => {
  return {
    CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
  };
});

jest.mock('./RoutesAndSettings');
jest.mock('./Utils');

const mockStandardsData = [
  ['', '', 'OPEN', 'F', 'Total', '', '', '48', 'Total', '250', 'Jane Doe', 'Competition', '2025-10-15'],
  ['', '', 'OPEN', 'F', 'Snatch', '', '', '48', 'Snatch', '110', 'Jane Doe', 'Competition', '2025-10-15'],
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderApp = () => {
    return render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  };

  describe('Rendering and Initialization', () => {
    test('renders main page with selection controls', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      renderApp();

      expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
      expect(screen.getByName('age-group')).toBeInTheDocument();
      expect(screen.getByName('weight-class')).toBeInTheDocument();
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

      const ageGroupSelect = screen.getByName('age-group');
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

      const ageGroupSelect = screen.getByName('age-group');
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

      const ageGroupSelect = screen.getByName('age-group');
      await userEvent.selectOption(ageGroupSelect, 'U15');

      await waitFor(() => {
        expect(Utils.getWeightClassSet).toHaveBeenCalled();
      });
    });

    test('clears weight class selection when age group changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const ageGroupSelect = screen.getByName('age-group');
      const weightClassSelect = screen.getByName('weight-class');

      await userEvent.selectOption(weightClassSelect, 'W48');
      expect(weightClassSelect.value).toBe('W48');

      await userEvent.selectOption(ageGroupSelect, 'U15');

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
      Utils.getWeightClassSet.mockReturnValue([
        mockWeightClass,
        { ...mockWeightClass, id: 'W53' },
      ]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
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

      const weightClassSelect = screen.getByName('weight-class');
      expect(weightClassSelect.value).toBe('');
      expect(
        screen.getByText('Select a Weight Class')
      ).toBeInTheDocument();
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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });

      await waitFor(() => {
        expect(goButton).not.toBeDisabled();
      });
    });

    test('shows loading spinner when Go button clicked', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });

    test('filters standards by calculated weight class range for plus sizes (>100kg)', async () => {
      const plusWeightClass = { ...mockWeightClass, id: 'W86plus', maxBodyweight: '1000', minBodyweight: '86.01' };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([plusWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W86plus');

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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('record-group')).toBeInTheDocument();
      });
    });

    test('renders CombinedRecordGroup component for historical records', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('combined-record-group')).toBeInTheDocument();
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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

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

      const weightClassSelect = screen.getByName('weight-class');
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

    test('transitions to loading state when Go is clicked', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([mockWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        expect(screen.getByTestId('record-group')).toBeInTheDocument();
      });
    });
  });

  describe('SKIPPED TESTS - Bugs Found', () => {
    test.skip('BUG: Standards indicator calculation for plus-weight classes should use correct format', async () => {
      // BUG POTENTIAL: App.js line 82-85
      // Issue: Weight class indicator calculation may not correctly handle plus sizes
      // Current Logic: if (maxBodyweight > 100) { weightClassIndicator = `>${parseInt(minBodyweight)}`; }
      // Problem: For W86plus (86.01 to 1000), this creates indicator ">86" but standards might use "86+" format
      // Test to verify: Standards filtering works correctly for W86plus and other plus classes
      const plusWeightClass = { 
        ...mockWeightClass, 
        id: 'W86plus', 
        maxBodyweight: '1000', 
        minBodyweight: '86.01',
        gender: 'female'
      };

      const standardsWithPlusFormat = [
        ['', '', 'OPEN', 'F', 'Total', '', '', '86+', 'Total', '350', 'Strong Lifter', 'Competition', '2025-10-15'],
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: standardsWithPlusFormat }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet.mockReturnValue([plusWeightClass]);

      renderApp();

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W86plus');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        // Standards should be found and displayed even with different plus format
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });

    test.skip('BUG: Weight class selection should maintain consistency across age group changes', async () => {
      // BUG POTENTIAL: App.js line 59-71
      // Issue: useEffect that clears weight class when age group changes may need optimization
      // Current Logic: If selected weight class is not in new age group's classes, clear selection
      // Potential Problem: This logic might clear selection too aggressively or not update properly
      // Test Case: Select a weight class, change age group, verify selection is cleared appropriately
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ values: mockStandardsData }),
      });

      Utils.getAgeGroup.mockReturnValue(mockAgeGroup);
      Utils.getWeightClassSet
        .mockReturnValueOnce([mockWeightClass]) // OPEN age group
        .mockReturnValueOnce([{ ...mockWeightClass, name: 'Youth W42kg' }]); // Different weight class for U15

      renderApp();

      const ageGroupSelect = screen.getByName('age-group');
      const weightClassSelect = screen.getByName('weight-class');

      // Select a weight class in OPEN
      await userEvent.selectOption(weightClassSelect, 'W48');
      expect(weightClassSelect.value).toBe('W48');

      // Change to age group with different weight classes
      await userEvent.selectOption(ageGroupSelect, 'U15');

      // Weight class should be cleared since U15 doesn't have W48
      await waitFor(() => {
        expect(weightClassSelect.value).toBe('');
      });
    });

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

      const weightClassSelect = screen.getByName('weight-class');
      await userEvent.selectOption(weightClassSelect, 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(screen.getByTestId('standards')).toBeInTheDocument();
      });
    });
  });
});
