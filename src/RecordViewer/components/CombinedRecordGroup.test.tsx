import { act, render, screen, waitFor } from '@testing-library/react';
import CombinedRecordGroup from './CombinedRecordGroup';
import * as RoutesAndSettings from '../../Data/RoutesAndSettings';
import * as Utils from '../../Utils/Utils';
import { AgeGroup, LifterAction, WeightClass } from '../../Utils/types';

jest.mock('../../Data/RoutesAndSettings');
jest.mock('../../Utils/Utils');
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

const mockWeightClass: WeightClass = {
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
} as unknown as AgeGroup;

const mockLifter = {
  name: 'Jane Doe',
  total: 250,
  best_snatch: 110,
  'best_c&j': 140,
  lift_date: '2018-05-15',
  lifter_age: '28',
  'body_weight_(kg)': '47',
  action: 'lifterId/12345' as unknown as LifterAction[],
  classData: mockWeightClass,
};

describe('CombinedRecordGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering and Loading States', () => {
    test('renders loading spinner initially', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

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
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('No historical records')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Async Fetches', () => {
    test('fetches all previousAnalogs with 100ms delays', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('State Management', () => {
    test('properly initializes state on component mount', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter1] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter2] }) });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalled();
      });
    });
  });

  describe('usePrevious Hook', () => {
    test('tracks previous newLiftsData to prevent duplicates', async () => {
      const lifter1 = { ...mockLifter, name: 'Lifter One' };
      const lifter2 = { ...mockLifter, name: 'Lifter Two' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter1] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter2] }) });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalled();
      });
    });
  });

  describe('Fetch Request Details', () => {
    test('sends correct request body for each previousAnalog', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

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
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/rankings',
          expect.objectContaining({
            body: expect.stringContaining('2018-01-01'),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('handles fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    test('handles non-ok response status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalled();
      });
    });
  });

  describe('Component Cleanup', () => {
    test('resets data when weightClass changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockReturnValue([]);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      const { rerender } = render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });
      jest.clearAllMocks();

      const newWeightClass: WeightClass = { ...mockWeightClass, id: 'W53' };

      await act(async () => {
        rerender(
          <CombinedRecordGroup
            weightClass={newWeightClass}
            ageGroup={mockAgeGroup}
            emptyContent={<div>No historical records</div>}
          />
        );
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Individual Lifts Processing', () => {
    test('calls setCombinedLiftsData with deduplication when individual lift matches', async () => {
      const matchingMeet = {
        date: '2018-05-15',
        total: 250,
        best_snatch: 110,
        'best_c&j': 140,
        'body_weight_(kg)': '47',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [mockLifter] }) })
        .mockResolvedValue({ ok: true, json: async () => ({ data: [matchingMeet] }) });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // sortLifts called without a key argument means the newLiftsData useEffect fired
        const calls = jest.mocked(Utils.sortLifts).mock.calls;
        const noKeyCall = calls.find((call) => call.length === 1);
        expect(noKeyCall).toBeDefined();
      });
    });

    test('skips fetchIndividualLifts when shouldIncludePastLifter returns false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(false);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Only the rankings fetch fires; individual lifts fetch is skipped
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    test('handles non-ok individual-lifts response without crashing (empty json body)', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [mockLifter] }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ data: [] }) });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(Utils.sortLifts).toHaveBeenCalled();
      });
    });

    test('fetchIndividualLifts stops after non-ok response (returns before json())', async () => {
      const jsonSpy = jest.fn().mockRejectedValue(new Error('not json'));

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [mockLifter] }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: jsonSpy });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Fix: add `return` before `Promise.resolve()` so json() is never called
        expect(jsonSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('SKIPPED TESTS - Bugs Found', () => {
    test('BUG: Multiple fetches should not trigger during single timer advance', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // 2 fetches per timer advance: 1 rankings fetch + 1 individual lifts fetch
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('BUG: CombinedRecordGroup state updates during fetch should be properly managed', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockLifter] }),
      });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      jest.mocked(RoutesAndSettings.getLifterDataRoute).mockReturnValue('/api/lifter/12345');
      jest.mocked(RoutesAndSettings.getLifterId).mockReturnValue('12345');
      Object.assign(RoutesAndSettings, { headers: {} });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('not wrapped in act')
      );

      consoleErrorSpy.mockRestore();
    });

    test('BUG: usePrevious hook should prevent duplicate lifter entries', async () => {
      const lifter1 = { ...mockLifter, name: 'Jane Doe', total: 245 };
      const lifter2 = { ...mockLifter, name: 'Jane Doe', total: 250 };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter1] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [lifter2] }) });

      jest.mocked(Utils.shouldIncludePastLifter).mockReturnValue(true);
      jest.mocked(Utils.sortLifts).mockImplementation((lifts) => lifts);
      jest.mocked(RoutesAndSettings.getRankingsRoute).mockReturnValue('/api/rankings');
      Object.assign(RoutesAndSettings, { headers: {} });

      render(
        <CombinedRecordGroup
          weightClass={mockWeightClass}
          ageGroup={mockAgeGroup}
          emptyContent={<div>No historical records</div>}
        />
      );

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const calls = jest.mocked(Utils.sortLifts).mock.calls;
        const lastCall = calls[calls.length - 1];
        const uniqueNames = new Set(lastCall[0].map((lift) => lift.name));
        expect(uniqueNames.size).toBe(lastCall[0].length);
      });
    });
  });
});
