import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { maxCleanAndJerk, maxSnatch, maxTotal, wsoBoundary } from '../Data/RoutesAndSettings';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from '../Data/youthWeightClasses';
import { AgeGroup, CombinedLiftData, MeetRecord, SortKey, WeightClass } from './types';

export const getAgeGroup = (ageGroupId: string): AgeGroup | undefined => {
  return ageGroups.find((group) => group.id === ageGroupId);
};

// The records sheets label masters groups with a gender prefix ('W35', 'M40'), while our
// AgeGroup ids are the bare starting age ('35', '40'). Open/Junior/youth labels already
// match. The current-records sheet sidesteps this by keying masters off its ageMin column;
// the historical sheets have no such column in the same position, so normalize here.
export const normalizeSheetAgeGroup = (sheetAgeGroup: string): string => {
  const value = String(sheetAgeGroup).toUpperCase();
  const mastersLabel = /^[WM](\d{2})$/.exec(value);
  return mastersLabel ? mastersLabel[1] : value;
};

export const getWeightClassSet = (ageGroup: AgeGroup | undefined | null): WeightClass[] => {
  if (!ageGroup || !ageGroup.customWeightClasses) {
    return defaultWeightClasses;
  }
  if (ageGroup.id === 'U11') {
    return u11WeightClasses;
  }
  if (ageGroup.id === 'U13') {
    return u13WeightClasses;
  }
  if (ageGroup.id === 'U15') {
    return u15WeightClasses;
  }
  if (ageGroup.id === 'U17') {
    return u17WeightClasses;
  }
  return defaultWeightClasses;
};

export const handleError = (error: unknown): void => {
  console.log('An error occurred?', error);
};

export const sortLifts = (lifts: CombinedLiftData[], key?: SortKey): CombinedLiftData[] => {
  const useKey: SortKey = key || 'total';
  const liftMap = (lift: CombinedLiftData) => lift as unknown as Record<string, unknown>;

  // For date sorting, keep all lifts
  if (useKey === 'lift_date') {
    const result = lifts.sort(function (liftA, liftB) {
      const keyA = new Date(liftA.lift_date);
      const keyB = new Date(liftB.lift_date);
      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return (parseInt(String(liftB.total)) || 0) - (parseInt(String(liftA.total)) || 0);
    });
    const trimmedResult: CombinedLiftData[] = [];
    for (let i = 0; i < result.length; i++) {
      if (trimmedResult.indexOf(result[i]) === -1) {
        trimmedResult.push(result[i]);
      }
    }
    return trimmedResult;
  }

  // For other metrics (total, best_snatch, best_c&j), keep only best per athlete
  const athleteMap = new Map<string, CombinedLiftData>();
  for (const lift of lifts) {
    const athleteName = lift.name;
    const rawValue = liftMap(lift)[useKey];
    const liftValue = rawValue !== undefined && rawValue !== null ? parseInt(String(rawValue)) : 0;

    if (!athleteMap.has(athleteName)) {
      athleteMap.set(athleteName, lift);
    } else {
      const existingLift = athleteMap.get(athleteName);
      if (existingLift) {
        const existingRaw = liftMap(existingLift)[useKey];
        const existingValue =
          existingRaw !== undefined && existingRaw !== null ? parseInt(String(existingRaw)) : 0;
        if (liftValue > existingValue) {
          athleteMap.set(athleteName, lift);
        }
      }
    }
  }

  const result = Array.from(athleteMap.values());
  result.sort(function (liftA, liftB) {
    const rawLiftA = liftMap(liftA)[useKey];
    const rawLiftB = liftMap(liftB)[useKey];
    const keyLiftA = rawLiftA !== undefined && rawLiftA !== null ? parseInt(String(rawLiftA)) : 0;
    const keyLiftB = rawLiftB !== undefined && rawLiftB !== null ? parseInt(String(rawLiftB)) : 0;
    if (keyLiftA > keyLiftB) return -1;
    if (keyLiftA < keyLiftB) return 1;
    return new Date(liftA.lift_date).getTime() - new Date(liftB.lift_date).getTime();
  });

  return result;
};

export const shouldIncludePastLifter = (
  lifter: { total: number },
  _weightClass?: WeightClass
): boolean => {
  const totalIsPlausible = lifter.total <= 550;
  return totalIsPlausible;
};

export const isWithinPlausibilityCaps = (lifter: {
  total: number;
  best_snatch?: number;
  'best_c&j'?: number;
}): boolean => {
  return (
    (lifter.best_snatch == null || lifter.best_snatch <= maxSnatch) &&
    (lifter['best_c&j'] == null || lifter['best_c&j'] <= maxCleanAndJerk) &&
    lifter.total <= maxTotal
  );
};

export const findSupportingTotal = (
  lifter: { total: number },
  meets: MeetRecord[],
  weightClass: WeightClass,
  startDate: string,
  endDate: string
): number | undefined => {
  const minBw = parseFloat(weightClass.minBodyweight);
  const maxBw = parseFloat(weightClass.maxBodyweight);
  const candidates: number[] = [];
  for (const meet of meets) {
    const meetBw = parseFloat(String(meet['body_weight_(kg)'] ?? 0));
    if (
      meetBw > 0 &&
      meetBw >= minBw &&
      meetBw <= maxBw &&
      meet.date >= startDate &&
      meet.date <= endDate &&
      isWithinPlausibilityCaps(meet) &&
      Math.abs(meet.total - lifter.total) <= 20
    ) {
      candidates.push(meet.total);
    }
  }
  if (candidates.includes(lifter.total)) return lifter.total;
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, t) =>
    Math.abs(t - lifter.total) < Math.abs(best - lifter.total) ? t : best
  );
};

export const getYear = (date: string): number => {
  return new Date(date).getUTCFullYear();
};

export const isWithinWSOBoundary = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= wsoBoundary.south &&
    latitude <= wsoBoundary.north &&
    longitude >= wsoBoundary.west &&
    longitude <= wsoBoundary.east
  );
};

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Ten requests a second, hard ceiling. The state is module-level on purpose: every script
// and endpoint shares one budget, because they all land on the same upstream APIs and would
// otherwise compound. Each caller claims the next free slot before it awaits, so the spacing
// holds even when requests are issued concurrently.
const minRequestIntervalMs = 100;
let nextRequestAt = 0;

export const rateLimitedFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextRequestAt);
  nextRequestAt = scheduledAt + minRequestIntervalMs;
  const wait = scheduledAt - now;
  if (wait > 0) await delay(wait);
  return fetch(url, init);
};

// Shared by the runnable scripts, which all download their results as CSV.
export const csvField = (value: unknown): string => {
  const str = String(value ?? '');
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

export async function hashPassword(input: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${input}---${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
