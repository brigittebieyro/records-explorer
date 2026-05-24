import { ageGroups } from './Data/ageGroups';
import { defaultWeightClasses } from './Data/defaultWeightClasses';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from './Data/youthWeightClasses';
import { AgeGroup, CombinedLiftData, SortKey, WeightClass } from './types';

export const getAgeGroup = (ageGroupId: string): AgeGroup | undefined => {
  return ageGroups.find((group) => group.id === ageGroupId);
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
  console.log(`Could not find custom weight classes for ${ageGroup.id}`);
  return defaultWeightClasses;
};

export const handleError = (error: unknown): void => {
  console.log(`An error occurred?`, error);
};

export const sortLifts = (lifts: CombinedLiftData[], key?: SortKey): CombinedLiftData[] => {
  const useKey: SortKey = key || 'total';
  const liftMap = (lift: CombinedLiftData) => lift as unknown as Record<string, unknown>;

  // For date sorting, keep all lifts
  if (useKey === 'lift_date') {
    const result = lifts.sort(function (a, b) {
      const keyA = new Date(a.lift_date);
      const keyB = new Date(b.lift_date);
      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return (parseInt(String(b.total)) || 0) - (parseInt(String(a.total)) || 0);
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
      const existingLift = athleteMap.get(athleteName)!;
      const existingRaw = liftMap(existingLift)[useKey];
      const existingValue =
        existingRaw !== undefined && existingRaw !== null ? parseInt(String(existingRaw)) : 0;
      if (liftValue > existingValue) {
        athleteMap.set(athleteName, lift);
      }
    }
  }

  const result = Array.from(athleteMap.values());
  result.sort(function (a, b) {
    const rawA = liftMap(a)[useKey];
    const rawB = liftMap(b)[useKey];
    const keyA = rawA !== undefined && rawA !== null ? parseInt(String(rawA)) : 0;
    const keyB = rawB !== undefined && rawB !== null ? parseInt(String(rawB)) : 0;
    if (keyA > keyB) return -1;
    if (keyA < keyB) return 1;
    return new Date(a.lift_date).getTime() - new Date(b.lift_date).getTime();
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

export const getYear = (date: string): number => {
  return new Date(date).getUTCFullYear();
};
