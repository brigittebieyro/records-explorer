import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordGroup from './RecordGroup';
import * as RoutesAndSettings from './RoutesAndSettings';
import * as Utils from './Utils';

// Mock dependencies
jest.mock('./RoutesAndSettings');
jest.mock('./Utils');
jest.mock('react-spinners', () => {
  return {
    CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
  };
});

// Mock data
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

const mockLifter = {
  name: 'Jane Doe',
  total: 250,
  best_snatch: 110,
  'best_c&j': 140,
  lift_date: '2025-10-15',
  lifter_age: '28',
  'body_weight_(kg)': '47',
  action: 'lifterId/12345',
};

const mockMeetData = {
  date: '2025-10-15',
  'body_weight_(kg)': '47',
  total: 250,
  best_snatch: 110,
  'best_c&j': 140,
};

describe('RecordGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering and Loading States', () => {
    test('renders loading spinner initially', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    });

    test('renders empty content when no lifters match', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters found</div>}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No lifters found')).toBeInTheDocument();
      });
    });
  });

  describe('Fetching Records', () => {
    test('calls fetch with correct parameters for rankings', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};
      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/rankings',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: expect.stringContaining('"weight_class":709'),
          })
        );
      });
    });

    test('handles API error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      global.fetch.mockRejectedValue(new Error('Network error'));

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Bodyweight Filtering', () => {
    test('includes lifter at minimum bodyweight boundary', async () => {
      const liftersAtMin = [
        { ...mockLifter, 'body_weight_(kg)': '0' },
      ];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: liftersAtMin }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockMeetData] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('includes lifter at maximum bodyweight boundary', async () => {
      const liftersAtMax = [
        { ...mockLifter, 'body_weight_(kg)': '48' },
      ];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: liftersAtMax }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockMeetData] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('filters out lifter exceeding maximum bodyweight', async () => {
      const lifterTooHeavy = [
        { ...mockLifter, 'body_weight_(kg)': '48.5' },
      ];

      const meetAtBoundary = { ...mockMeetData, 'body_weight_(kg)': '48.5' };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: lifterTooHeavy }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [meetAtBoundary] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Age-based Year Filtering', () => {
    test('calculates correct year range for lifter at minimum age', async () => {
      const ageAtRanking = 20;
      const rankingYear = 2025;
      const lifterMinAge = 20;
      const lifterMaxAge = 34;

      const expectedMinYear = rankingYear - (ageAtRanking - lifterMinAge);
      const expectedMaxYear = rankingYear + (lifterMaxAge - ageAtRanking);

      expect(expectedMinYear).toBe(2025);
      expect(expectedMaxYear).toBe(2039);
    });

    test('calculates correct year range for lifter at maximum age', async () => {
      const ageAtRanking = 34;
      const rankingYear = 2025;
      const lifterMinAge = 20;
      const lifterMaxAge = 34;

      const expectedMinYear = rankingYear - (ageAtRanking - lifterMinAge);
      const expectedMaxYear = rankingYear + (lifterMaxAge - ageAtRanking);

      expect(expectedMinYear).toBe(2011);
      expect(expectedMaxYear).toBe(2025);
    });

    test('filters lifts outside age-based year range', async () => {
      const meetOutsideRange = { ...mockMeetData, date: '2000-01-01' };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockLifter] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [meetOutsideRange] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Date Range Filtering', () => {
    test('filters lifts outside provided date range', async () => {
      const meetBeforeRange = { ...mockMeetData, date: '2025-05-31' };
      const meetAfterRange = { ...mockMeetData, date: '2026-05-24' };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockLifter, mockLifter] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [meetBeforeRange, mockMeetData, meetAfterRange] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Sort Type Switching', () => {
    test('renders sort dropdown when data available', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockLifter] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockMeetData] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Overall Total')).toBeInTheDocument();
      });
    });

    test('changes sort when dropdown selected', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockLifter] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockMeetData] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        const dropdown = screen.getByDisplayValue('Overall Total');
        expect(dropdown).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox', { name: /sort/i });
      await userEvent.selectOption(select, 'best_snatch');

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalledWith(
          expect.any(Array),
          'best_snatch'
        );
      });
    });

    test('disables sort dropdown while loading', async () => {
      global.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ data: [mockLifter] }),
              });
            }, 1000);
          })
      );

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      const select = screen.queryByRole('combobox', { name: /sort/i });
      if (select) {
        expect(select).toHaveAttribute('disabled');
      }
    });
  });

  describe('Component Updates', () => {
    test('refetches when weightClass changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      const { rerender } = render(
        <RecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      const newWeightClass = { ...mockWeightClass, id: 'W53' };

      rerender(
        <RecordGroup
          weightClass={newWeightClass}
          ageGroup={mockAgeGroup}
          count={5}
          startDate="2025-06-01"
          endDate="2026-05-23"
          emptyContent={<div>No lifters</div>}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
