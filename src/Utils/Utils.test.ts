import { createHash, webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
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
  hashPassword,
  isWithinPlausibilityCaps,
  isWithinWSOBoundary,
  shouldIncludePastLifter,
  sortLifts,
} from './Utils';
import { CombinedLiftData } from './types';

// jsdom does not provide crypto.subtle or TextEncoder; hashPassword needs both.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
}

const makeLift = (overrides: object = {}): CombinedLiftData =>
  ({
    name: 'Jane Doe',
    total: 150,
    lifter_age: '25',
    lift_date: '2026-01-15',
    action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/1' }],
    best_snatch: 70,
    'best_c&j': 80,
    ...overrides,
  }) as unknown as CombinedLiftData;

describe('Utils (user-based)', () => {
  describe('getAgeGroup', () => {
    test('returns the matching age group by id', () => {
      expect(getAgeGroup('OPEN')?.name).toBe('Open');
      expect(getAgeGroup('U13')?.name).toBe('Under 13');
    });

    test('G-05: returns undefined for a bogus id', () => {
      expect(getAgeGroup('BOGUS')).toBeUndefined();
    });
  });

  describe('B-06: getWeightClassSet', () => {
    test('returns the default classes for Open and missing age groups', () => {
      expect(getWeightClassSet(getAgeGroup('OPEN'))).toBe(defaultWeightClasses);
      expect(getWeightClassSet(undefined)).toBe(defaultWeightClasses);
      expect(getWeightClassSet(null)).toBe(defaultWeightClasses);
    });

    test('returns the youth class sets for U11 through U17', () => {
      expect(getWeightClassSet(getAgeGroup('U11'))).toBe(u11WeightClasses);
      expect(getWeightClassSet(getAgeGroup('U13'))).toBe(u13WeightClasses);
      expect(getWeightClassSet(getAgeGroup('U15'))).toBe(u15WeightClasses);
      expect(getWeightClassSet(getAgeGroup('U17'))).toBe(u17WeightClasses);
    });

    test('returns default classes for non-youth age groups like Masters', () => {
      expect(getWeightClassSet(getAgeGroup('35'))).toBe(defaultWeightClasses);
    });

    test('every age group id resolves to a non-empty weight class set', () => {
      for (const group of ageGroups) {
        expect(getWeightClassSet(group).length).toBeGreaterThan(0);
      }
    });
  });

  describe('B-13: sortLifts', () => {
    test('defaults to sorting by total, descending, keeping the best per athlete', () => {
      const lifts = [
        makeLift({ name: 'A', total: 100 }),
        makeLift({ name: 'A', total: 120 }),
        makeLift({ name: 'B', total: 110 }),
      ];
      const sorted = sortLifts(lifts);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].name).toBe('A');
      expect(sorted[0].total).toBe(120);
      expect(sorted[1].name).toBe('B');
    });

    test('sorts by best_snatch when requested', () => {
      const lifts = [
        makeLift({ name: 'A', total: 200, best_snatch: 80 }),
        makeLift({ name: 'B', total: 150, best_snatch: 95 }),
      ];
      const sorted = sortLifts(lifts, 'best_snatch');
      expect(sorted[0].name).toBe('B');
    });

    test('sorts by best_c&j when requested', () => {
      const lifts = [
        makeLift({ name: 'A', 'best_c&j': 100 }),
        makeLift({ name: 'B', 'best_c&j': 130 }),
      ];
      const sorted = sortLifts(lifts, 'best_c&j');
      expect(sorted[0].name).toBe('B');
    });

    test('sorts by lift_date newest first, keeping all lifts', () => {
      const lifts = [
        makeLift({ name: 'A', lift_date: '2025-01-01' }),
        makeLift({ name: 'A', lift_date: '2026-03-01' }),
        makeLift({ name: 'B', lift_date: '2026-01-01' }),
      ];
      const sorted = sortLifts(lifts, 'lift_date');
      expect(sorted).toHaveLength(3);
      expect(sorted[0].lift_date).toBe('2026-03-01');
      expect(sorted[1].lift_date).toBe('2026-01-01');
      expect(sorted[2].lift_date).toBe('2025-01-01');
    });

    test('treats missing sort values as 0', () => {
      const lifts = [
        makeLift({ name: 'A', best_snatch: undefined }),
        makeLift({ name: 'B', best_snatch: 50 }),
      ];
      const sorted = sortLifts(lifts, 'best_snatch');
      expect(sorted[0].name).toBe('B');
    });
  });

  describe('G-04: plausibility filters', () => {
    test('shouldIncludePastLifter allows totals up to 550', () => {
      expect(shouldIncludePastLifter({ total: 550 })).toBe(true);
      expect(shouldIncludePastLifter({ total: 551 })).toBe(false);
    });

    test('isWithinPlausibilityCaps accepts boundary values 200/280/470', () => {
      expect(isWithinPlausibilityCaps({ total: 470, best_snatch: 200, 'best_c&j': 280 })).toBe(
        true
      );
    });

    test('isWithinPlausibilityCaps rejects any value over its cap', () => {
      expect(isWithinPlausibilityCaps({ total: 471 })).toBe(false);
      expect(isWithinPlausibilityCaps({ total: 100, best_snatch: 201 })).toBe(false);
      expect(isWithinPlausibilityCaps({ total: 100, 'best_c&j': 281 })).toBe(false);
    });

    test('isWithinPlausibilityCaps allows missing snatch and clean & jerk', () => {
      expect(isWithinPlausibilityCaps({ total: 100 })).toBe(true);
    });
  });

  describe('getYear', () => {
    test('returns the UTC year of a date string', () => {
      expect(getYear('1998-01-01')).toBe(1998);
      expect(getYear('2026-12-31')).toBe(2026);
    });
  });

  describe('C-01: isWithinWSOBoundary', () => {
    test('Sacramento is inside the boundary', () => {
      expect(isWithinWSOBoundary(38.58, -121.49)).toBe(true);
    });

    test('Los Angeles is outside the boundary (south of Kern County)', () => {
      expect(isWithinWSOBoundary(34.05, -118.24)).toBe(false);
    });

    test('boundary edges are inclusive', () => {
      expect(isWithinWSOBoundary(42.01, -124.41)).toBe(true);
      expect(isWithinWSOBoundary(34.79, -114.13)).toBe(true);
    });
  });

  describe('F-01 / F-02: hashPassword', () => {
    test('returns a deterministic 64-character hex SHA-256 digest', async () => {
      const first = await hashPassword('secret', 'salt');
      const second = await hashPassword('secret', 'salt');
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(first).toBe(second);
    });

    test('matches SHA-256 of "input---salt"', async () => {
      const expected = createHash('sha256').update('secret---salt').digest('hex');
      expect(await hashPassword('secret', 'salt')).toBe(expected);
    });

    test('different salts produce different hashes', async () => {
      expect(await hashPassword('secret', 'salt-a')).not.toBe(
        await hashPassword('secret', 'salt-b')
      );
    });
  });
});
