import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from '../Data/youthWeightClasses';
import {
  getAgeGroup,
  getWeightClassSet,
  getYear,
  handleError,
  isWithinWSOBoundary,
  shouldIncludePastLifter,
  sortLifts,
} from './Utils';
import { CombinedLiftData } from './types';

// Mock data fixtures
const mockLifts: CombinedLiftData[] = [
  {
    name: 'John Doe',
    total: 305,
    best_snatch: 135,
    'best_c&j': 170,
    lift_date: '2024-03-15',
    lifter_age: '30',
    action: [{ url: 'https://example.com/1' }],
  },
  {
    name: 'Jane Smith',
    total: 320,
    best_snatch: 140,
    'best_c&j': 180,
    lift_date: '2024-02-10',
    lifter_age: '28',
    action: [{ url: 'https://example.com/2' }],
  },
  {
    name: 'John Doe',
    total: 300,
    best_snatch: 130,
    'best_c&j': 170,
    lift_date: '2024-01-20',
    lifter_age: '30',
    action: [{ url: 'https://example.com/1' }],
  },
  {
    name: 'Jane Smith',
    total: 310,
    best_snatch: 138,
    'best_c&j': 172,
    lift_date: '2024-02-10',
    lifter_age: '28',
    action: [{ url: 'https://example.com/2' }],
  },
];

const mockLiftsWithZeros: CombinedLiftData[] = [
  {
    name: 'Incomplete Lifter',
    total: 0,
    best_snatch: 0,
    'best_c&j': 0,
    lift_date: '2024-03-01',
    lifter_age: '25',
    action: [{ url: 'https://example.com/3' }],
  },
  {
    name: 'Incomplete Lifter',
    total: 250,
    best_snatch: 110,
    'best_c&j': 140,
    lift_date: '2024-02-01',
    lifter_age: '25',
    action: [{ url: 'https://example.com/3' }],
  },
];

const mockLiftsWithNulls: CombinedLiftData[] = [
  {
    name: 'Null Lifter',
    total: 0, // null mapped to 0 for type safety
    best_snatch: undefined,
    'best_c&j': 160,
    lift_date: '2024-03-01',
    lifter_age: '30',
    action: [{ url: 'https://example.com/4' }],
  },
  {
    name: 'Null Lifter',
    total: 300,
    best_snatch: 130,
    'best_c&j': 170,
    lift_date: '2024-02-01',
    lifter_age: '30',
    action: [{ url: 'https://example.com/4' }],
  },
];

describe('sortLifts', () => {
  describe('sorting by lift_date (Most Recent)', () => {
    test('sorts lifts by date descending (most recent first)', () => {
      const result = sortLifts(mockLifts, 'lift_date');
      expect(result[0].lift_date).toBe('2024-03-15');
      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i - 1].lift_date) >= new Date(result[i].lift_date)).toBe(true);
      }
    });

    test('when same date, higher total appears first', () => {
      const liftsSameDate: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 300,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 320,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(liftsSameDate, 'lift_date');
      expect(result[0].total).toBe(320);
      expect(result[1].total).toBe(300);
    });

    test('keeps all lifts when sorting by date', () => {
      const result = sortLifts(mockLifts, 'lift_date');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    test('handles lifts with zero values', () => {
      const result = sortLifts(mockLiftsWithZeros, 'lift_date');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((lift) => lift.total === 0)).toBe(true);
    });

    test('handles lifts with null/undefined values', () => {
      const result = sortLifts(mockLiftsWithNulls, 'lift_date');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    test('uses 0 fallback when comparing same-date lifts where one has zero total', () => {
      const sameDateZeroTotal: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 0,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 300,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(sameDateZeroTotal, 'lift_date');
      expect(result[0].total).toBe(300);
      expect(result[1].total).toBe(0);
    });

    test('does not add duplicate object references when deduplicating by date', () => {
      const lift = mockLifts[0];
      const result = sortLifts([lift, lift], 'lift_date');
      expect(result.length).toBe(1);
    });
  });

  describe('sorting by total', () => {
    test('groups by athlete and keeps only the best total', () => {
      const result = sortLifts(mockLifts, 'total');
      const johnDoe = result.find((lift) => lift.name === 'John Doe');
      const janeSmith = result.find((lift) => lift.name === 'Jane Smith');
      expect(result.length).toBe(2);
      expect(johnDoe?.total).toBe(305);
      expect(janeSmith?.total).toBe(320);
    });

    test('sorts by total descending', () => {
      const result = sortLifts(mockLifts, 'total');
      expect(result[0].total).toBe(320);
      expect(result[1].total).toBe(305);
    });

    test('when same total, oldest date appears first', () => {
      const liftssameTotals: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 300,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 300,
          lift_date: '2024-01-10',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(liftssameTotals, 'total');
      if (result.length >= 2) {
        expect(result[0].lift_date).toBe('2024-01-10');
        expect(result[1].lift_date).toBe('2024-03-15');
      }
    });

    test('handles zero totals correctly', () => {
      const result = sortLifts(mockLiftsWithZeros, 'total');
      expect(result.length).toBe(1);
      expect(result[0].total).toBe(250);
    });

    test('handles null/undefined totals as 0', () => {
      const result = sortLifts(mockLiftsWithNulls, 'total');
      expect(result.length).toBe(1);
      expect(result[0].total).toBe(300);
    });
  });

  describe('sorting by best_snatch', () => {
    test('groups by athlete and keeps only best snatch', () => {
      const result = sortLifts(mockLifts, 'best_snatch');
      expect(result.length).toBe(2);
    });

    test('sorts by best_snatch descending', () => {
      const result = sortLifts(mockLifts, 'best_snatch');
      expect(result[0].best_snatch).toBe(140);
      expect(result[1].best_snatch).toBe(135);
    });

    test('when same snatch value, oldest date first', () => {
      const liftsSameSnatch: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          best_snatch: 130,
          lift_date: '2024-03-15',
          total: 200,
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          best_snatch: 130,
          lift_date: '2024-01-10',
          total: 200,
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(liftsSameSnatch, 'best_snatch');
      if (result.length >= 2) {
        expect(result[0].lift_date).toBe('2024-01-10');
        expect(result[1].lift_date).toBe('2024-03-15');
      }
    });

    test('handles zero snatches', () => {
      const result = sortLifts(mockLiftsWithZeros, 'best_snatch');
      expect(result.length).toBe(1);
      expect(result[0].best_snatch).toBe(110);
    });

    test('treats undefined snatch as 0 and keeps the lift with a defined snatch', () => {
      const mixedSnatch: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 200,
          best_snatch: undefined,
          lift_date: '2024-01-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete A',
          total: 250,
          best_snatch: 110,
          lift_date: '2024-02-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
      ];
      const result = sortLifts(mixedSnatch, 'best_snatch');
      expect(result.length).toBe(1);
      expect(result[0].best_snatch).toBe(110);
    });

    test('sorts athlete with undefined snatch below athlete with defined snatch', () => {
      const twoAthletes: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 200,
          best_snatch: undefined,
          lift_date: '2024-01-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 250,
          best_snatch: 110,
          lift_date: '2024-01-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(twoAthletes, 'best_snatch');
      expect(result[0].name).toBe('Athlete B');
      expect(result[1].name).toBe('Athlete A');
    });

    test('sorts athletes both with undefined snatch by date ascending', () => {
      const bothUndefined: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 200,
          best_snatch: undefined,
          lift_date: '2024-02-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 250,
          best_snatch: undefined,
          lift_date: '2024-01-01',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      const result = sortLifts(bothUndefined, 'best_snatch');
      expect(result.length).toBe(2);
      expect(result[0].lift_date).toBe('2024-01-01');
    });
  });

  describe('sorting by best_c&j', () => {
    test('groups by athlete and keeps only best clean and jerk', () => {
      const result = sortLifts(mockLifts, 'best_c&j');
      expect(result.length).toBe(2);
    });

    test('sorts by best_c&j descending', () => {
      const result = sortLifts(mockLifts, 'best_c&j');
      expect(result[0]['best_c&j']).toBe(180);
      expect(result[1]['best_c&j']).toBe(170);
    });

    test('handles zero clean and jerks', () => {
      const result = sortLifts(mockLiftsWithZeros, 'best_c&j');
      expect(result.length).toBe(1);
      expect(result[0]['best_c&j']).toBe(140);
    });
  });

  describe('edge cases', () => {
    test('defaults to total sort when no key argument is provided', () => {
      const result = sortLifts(mockLifts);
      expect(result[0].total).toBe(320);
      expect(result[1].total).toBe(305);
    });

    test('handles empty array', () => {
      const result = sortLifts([], 'total');
      expect(result).toEqual([]);
    });

    test('handles single lift', () => {
      const singleLift = [mockLifts[0]];
      const result = sortLifts(singleLift, 'total');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Doe');
    });

    test('handles multiple lifts from same athlete', () => {
      const sameAthlete: CombinedLiftData[] = [
        {
          name: 'John Doe',
          total: 305,
          lift_date: '2024-03-15',
          lifter_age: '30',
          action: [{ url: 'https://example.com/1' }],
        },
        {
          name: 'John Doe',
          total: 310,
          lift_date: '2024-04-01',
          lifter_age: '30',
          action: [{ url: 'https://example.com/1' }],
        },
        {
          name: 'John Doe',
          total: 300,
          lift_date: '2024-02-01',
          lifter_age: '30',
          action: [{ url: 'https://example.com/1' }],
        },
      ];
      const result = sortLifts(sameAthlete, 'total');
      expect(result.length).toBe(1);
      expect(result[0].total).toBe(310);
    });

    test('handles missing lift_date field', () => {
      const liftsNoDate: CombinedLiftData[] = [
        {
          name: 'Athlete A',
          total: 300,
          lift_date: '',
          lifter_age: '25',
          action: [{ url: 'https://example.com/a' }],
        },
        {
          name: 'Athlete B',
          total: 320,
          lift_date: '2024-03-15',
          lifter_age: '25',
          action: [{ url: 'https://example.com/b' }],
        },
      ];
      expect(() => sortLifts(liftsNoDate, 'lift_date')).not.toThrow();
    });
  });
});

describe('shouldIncludePastLifter', () => {
  test('returns true for plausible totals', () => {
    expect(shouldIncludePastLifter({ total: 250 })).toBe(true);
    expect(shouldIncludePastLifter({ total: 450 })).toBe(true);
    expect(shouldIncludePastLifter({ total: 550 })).toBe(true);
  });

  test('returns false for implausible totals', () => {
    expect(shouldIncludePastLifter({ total: 551 })).toBe(false);
    expect(shouldIncludePastLifter({ total: 600 })).toBe(false);
    expect(shouldIncludePastLifter({ total: 1000 })).toBe(false);
  });

  test('returns true for zero total', () => {
    expect(shouldIncludePastLifter({ total: 0 })).toBe(true);
  });

  test('returns true for negative total (edge case)', () => {
    expect(shouldIncludePastLifter({ total: -100 })).toBe(true);
  });
});

describe('getYear', () => {
  test('extracts year from valid date string', () => {
    expect(getYear('2024-03-15')).toBe(2024);
    expect(getYear('2020-01-01')).toBe(2020);
    expect(getYear('2026-12-31')).toBe(2026);
  });

  test('handles different date formats', () => {
    expect(getYear('2024/03/15')).toBe(2024);
    expect(getYear('03-15-2024')).toBe(2024);
  });

  test('handles UTC date strings', () => {
    expect(getYear('2024-03-15T10:30:00Z')).toBe(2024);
  });

  test('returns NaN for invalid dates', () => {
    expect(isNaN(getYear('invalid'))).toBe(true);
  });
});

describe('getAgeGroup', () => {
  test('returns correct age group by id', () => {
    const result = getAgeGroup('OPEN');
    expect(result).toBeDefined();
    expect(result?.id).toBe('OPEN');
  });

  test('returns undefined for non-existent age group', () => {
    const result = getAgeGroup('NONEXISTENT');
    expect(result).toBeUndefined();
  });

  test('handles all standard age groups', () => {
    const standardGroups = ['OPEN', 'MASTERS_35_39', 'MASTERS_40_44', 'MASTERS_45_49'];
    standardGroups.forEach((groupId) => {
      const result = getAgeGroup(groupId);
      if (ageGroups.find((group) => group.id === groupId)) {
        expect(result).toBeDefined();
      }
    });
  });

  test('handles youth age groups', () => {
    const youthGroups = ['U11', 'U13', 'U15'];
    youthGroups.forEach((groupId) => {
      const result = getAgeGroup(groupId);
      if (ageGroups.find((group) => group.id === groupId)) {
        expect(result).toBeDefined();
      }
    });
  });
});

describe('getWeightClassSet', () => {
  test('returns default weight classes if ageGroup is null', () => {
    const result = getWeightClassSet(null);
    expect(result).toEqual(defaultWeightClasses);
  });

  test('returns default weight classes if ageGroup has no customWeightClasses', () => {
    const ageGroup = {
      id: 'OPEN',
      name: 'Open',
      usawDisplayKey: 'Open',
      minimum_lifter_age: '0',
      maximum_lifter_age: '1000',
      disabled: false,
      customWeightClasses: false,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(defaultWeightClasses);
  });

  test('returns U11 weight classes for U11 age group', () => {
    const ageGroup = {
      id: 'U11',
      name: 'Under 11',
      usawDisplayKey: '11 Under Age Group',
      minimum_lifter_age: '0',
      maximum_lifter_age: '11',
      disabled: false,
      customWeightClasses: true,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(u11WeightClasses);
  });

  test('returns U13 weight classes for U13 age group', () => {
    const ageGroup = {
      id: 'U13',
      name: 'Under 13',
      usawDisplayKey: '13 Under Age Group',
      minimum_lifter_age: '0',
      maximum_lifter_age: '13',
      disabled: false,
      customWeightClasses: true,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(u13WeightClasses);
  });

  test('returns U15 weight classes for U15 age group', () => {
    const ageGroup = {
      id: 'U15',
      name: 'Under 15',
      usawDisplayKey: '14-15 Age Group',
      minimum_lifter_age: '14',
      maximum_lifter_age: '15',
      disabled: false,
      customWeightClasses: true,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(u15WeightClasses);
  });

  test('returns default for unknown custom weight class', () => {
    const ageGroup = {
      id: 'UNKNOWN',
      name: 'Unknown',
      usawDisplayKey: 'Unknown',
      minimum_lifter_age: '0',
      maximum_lifter_age: '100',
      disabled: false,
      customWeightClasses: true,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(defaultWeightClasses);
  });

  test('returns U17 weight classes for U17 age group', () => {
    const ageGroup = {
      id: 'U17',
      name: 'Under 17',
      usawDisplayKey: '16-17 Age Group',
      minimum_lifter_age: '16',
      maximum_lifter_age: '17',
      disabled: false,
      customWeightClasses: true,
    };
    const result = getWeightClassSet(ageGroup);
    expect(result).toEqual(u17WeightClasses);
  });

  test('weight classes have required properties', () => {
    const weightClasses = getWeightClassSet({
      id: 'OPEN',
      name: 'Open',
      usawDisplayKey: 'Open',
      minimum_lifter_age: '0',
      maximum_lifter_age: '1000',
      disabled: false,
      customWeightClasses: false,
    });
    weightClasses.forEach((wc) => {
      expect(wc).toHaveProperty('id');
      expect(wc).toHaveProperty('name');
      expect(wc).toHaveProperty('gender');
    });
  });
});

describe('isWithinWSOBoundary', () => {
  describe('points inside the boundary', () => {
    test('Sacramento', () => {
      expect(isWithinWSOBoundary(38.58, -121.49)).toBe(true);
    });

    test('San Francisco', () => {
      expect(isWithinWSOBoundary(37.77, -122.42)).toBe(true);
    });

    test('Bakersfield (southern Kern County)', () => {
      expect(isWithinWSOBoundary(35.37, -119.02)).toBe(true);
    });

    test('southernmost point of Kern County', () => {
      expect(isWithinWSOBoundary(34.79, -119.0)).toBe(true);
    });

    test('exactly on the northern boundary', () => {
      expect(isWithinWSOBoundary(42.01, -120.0)).toBe(true);
    });

    test('exactly on the western boundary', () => {
      expect(isWithinWSOBoundary(38.5, -124.41)).toBe(true);
    });

    test('exactly on the eastern boundary', () => {
      expect(isWithinWSOBoundary(38.5, -114.13)).toBe(true);
    });
  });

  describe('points outside the boundary', () => {
    test('Los Angeles (south of boundary)', () => {
      expect(isWithinWSOBoundary(34.05, -118.24)).toBe(false);
    });

    test('San Diego (south of boundary)', () => {
      expect(isWithinWSOBoundary(32.72, -117.16)).toBe(false);
    });

    test('just south of the southern boundary', () => {
      expect(isWithinWSOBoundary(34.78, -119.0)).toBe(false);
    });

    test('just north of the northern boundary (Oregon interior)', () => {
      expect(isWithinWSOBoundary(42.02, -120.0)).toBe(false);
    });

    test('Pacific Ocean (west of boundary)', () => {
      expect(isWithinWSOBoundary(37.77, -125.0)).toBe(false);
    });

    test('Arizona (east of boundary)', () => {
      expect(isWithinWSOBoundary(36.17, -113.5)).toBe(false);
    });
  });
});

describe('handleError', () => {
  test('logs the error to console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    handleError('test error');
    expect(consoleSpy).toHaveBeenCalledWith('An error occurred?', 'test error');
    consoleSpy.mockRestore();
  });

  test('accepts Error objects', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const err = new Error('boom');
    handleError(err);
    expect(consoleSpy).toHaveBeenCalledWith('An error occurred?', err);
    consoleSpy.mockRestore();
  });

  test('accepts undefined', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    handleError(undefined);
    expect(consoleSpy).toHaveBeenCalledWith('An error occurred?', undefined);
    consoleSpy.mockRestore();
  });
});
