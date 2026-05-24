import { render, screen, waitFor } from '@testing-library/react';
import CombinedRecordGroup from './CombinedRecordGroup';
import * as RoutesAndSettings from './RoutesAndSettings';
import * as Utils from './Utils';

jest.mock('./RoutesAndSettings');
jest.mock('./Utils');
jest.mock('./RecordHolder', () => {
  return function RecordHolder() {
    return <div data-testid="record-holder">Record Holder</div>;
  };
});
jest.mock('react-spinners', () => {
  return {
    CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
  };
});

const mockWeightClass = {
  id: 'W48',
  name: "Women's 48kg",
  sport80Id: 709,
  minBodyweight: '0',
  maxBodyweight: '48',
  gender: 'female',
  start: '2025-06-01',
  previousAnalogs: [
    {
      name: "Women's 45kg",
      sport80Id: 91,
      gender: 'female',
      start: '2018-01-01',
      end: '2025-06-01',
    },
    {
      name: "Women's 48kg",
      sport80Id: 362,
      gender: 'female',
      start: '1980-01-01',
      end: '2018-01-01',
    },
  ],
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
  lift_date: '2018-05-15',
  lifter_age: '28',
  'body_weight_(kg)': '47',
  action: 'lifterId/12345',
  classData: mockWeightClass.previousAnalogs[0],
};

const mockMeetData = {
  date: '2018-05-15',
  'body_weight_(kg)': '47',
  total: 250,
  best_snatch: 110,
  'best_c&j': 140,
};

describe('CombinedRecordGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering and Loading States', () => {
    test('renders loading spinner initially', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    });

    test('renders empty content when no lifters found', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(screen.getByText('No historical records')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Async Fetches', () => {
    test('fetches all previousAnalogs with 100ms delays', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('skips previousAnalogs with sport80Id of 0', async () => {
      const weightClassWithZeroId = {
        ...mockWeightClass,
        previousAnalogs: [
          { ...mockWeightClass.previousAnalogs[0], sport80Id: 0 },
          ...mockWeightClass.previousAnalogs.slice(1),
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={weightClassWithZeroId}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('State Management', () => {
    test('properly initializes state on component mount', () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    });

    test('merges lifter data from multiple analogs', async () => {
      const lifter1 = { ...mockLifter, total: 240 };
      const lifter2 = { ...mockLifter, total: 250, name: 'Different Lifter' };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [lifter1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [lifter2] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalled();
      });
    });
  });

  describe('usePrevious Hook', () => {
    test('tracks previous newLiftsData to prevent duplicates', async () => {
      const lifter1 = { ...mockLifter, name: 'Lifter One' };
      const lifter2 = { ...mockLifter, name: 'Lifter Two' };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [lifter1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [lifter2] }),
        });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockImplementation((lifts) => lifts);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.getLifterDataRoute.mockReturnValue('/api/lifter/12345');
      RoutesAndSettings.getLifterId.mockReturnValue('12345');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalled();
      });
    });
  });

  describe('Fetch Request Details', () => {
    test('sends correct request body for each previousAnalog', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/rankings',
          expect.objectContaining({
            body: expect.stringContaining('"weight_class":91'),
          })
        );
      });
    });

    test('includes correct date ranges in request for each analog', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/rankings',
          expect.objectContaining({
            body: expect.stringContaining('2018-01-01'),
            body: expect.stringContaining('2025-06-01'),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('handles fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      global.fetch.mockRejectedValue(new Error('Network error'));

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    test('handles non-ok response status', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalled();
      });
    });
  });

  describe('Component Cleanup', () => {
    test('resets data when weightClass changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      Utils.shouldIncludePastLifter.mockReturnValue(true);
      Utils.sortLifts.mockReturnValue([]);
      RoutesAndSettings.getRankingsRoute.mockReturnValue('/api/rankings');
      RoutesAndSettings.headers = {};

      const { rerender } = render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();
      jest.clearAllMocks();

      const newWeightClass = { ...mockWeightClass, id: 'W53' };

      rerender(
        <CombinedRecordGroup
          weightClass={newWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      jest.runAllTimers();

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
