import { ageGroups } from "./Data/ageGroups";
import { defaultWeightClasses } from "./Data/defaultWeightClasses";
import { u11WeightClasses, u13WeightClasses, u15WeightClasses } from "./Data/youthWeightClasses";

export const getAgeGroup = (ageGroupId) => {
  return ageGroups.find((group) => group.id === ageGroupId);
};

export const getWeightClassSet = (ageGroup) => {
  if (!ageGroup || !ageGroup.customWeightClasses) {
    return defaultWeightClasses;
  }
  if (ageGroup.id === "U11") {
    return u11WeightClasses;
  }
  if (ageGroup.id === "U13") {
    return u13WeightClasses;
  }
  if (ageGroup.id === "U15") {
    return u15WeightClasses;
  }
  console.log(`Could not find custom weight classes for ${ageGroup.id}`);
  return defaultWeightClasses;
};

export const handleError = (error) => {
  console.log(`An error occurred?`, error);
};

export const sortLifts = (lifts, key) => {
  let useKey = key || "total";

  // For date sorting, keep all lifts
  if (useKey === "lift_date") {
    let result = lifts.sort(function (a, b) {
      var keyA = new Date(a[useKey]),
        keyB = new Date(b[useKey]);
      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return (parseInt(b.total) || 0) - (parseInt(a.total) || 0);
    });
    let trimmedResult = [];
    for (let i = 0; i < result.length; i++) {
      if (trimmedResult.indexOf(result[i]) === -1) {
        trimmedResult.push(result[i]);
      }
    }
    return trimmedResult;
  }

  // For other metrics (total, best_snatch, best_c&j), keep only best per athlete
  // Group by athlete name and keep the performance with the highest value for the metric
  const athleteMap = new Map();
  for (let lift of lifts) {
    const athleteName = lift.name;
    // Handle zero and non-zero values correctly
    const liftValue = lift[useKey] !== undefined && lift[useKey] !== null ? parseInt(lift[useKey]) : 0;

    if (!athleteMap.has(athleteName)) {
      athleteMap.set(athleteName, lift);
    } else {
      const existingLift = athleteMap.get(athleteName);
      const existingValue = existingLift[useKey] !== undefined && existingLift[useKey] !== null ? parseInt(existingLift[useKey]) : 0;
      // Only replace if new value is strictly greater
      if (liftValue > existingValue) {
        athleteMap.set(athleteName, lift);
      }
    }
  }

  // Convert map to array and sort
  let result = Array.from(athleteMap.values());
  result.sort(function (a, b) {
    var keyA = a[useKey] !== undefined && a[useKey] !== null ? parseInt(a[useKey]) : 0;
    var keyB = b[useKey] !== undefined && b[useKey] !== null ? parseInt(b[useKey]) : 0;
    if (keyA > keyB) return -1;
    if (keyA < keyB) return 1;
    return new Date(a.lift_date) - new Date(b.lift_date);
  });

  return result;
};

export const shouldIncludePastLifter = (lifter, weightClass) => {
  const totalIsPlausible = lifter.total <= 550;
  return totalIsPlausible;
  // Some international events for not have the lifter's bodyweights!
  // if (!lifter.bodyweight) {
  //   return totalIsPlausible;
  // }
  // const minBodyweight = weightClass?.minBodyweight;
  // const maxBodyweight = weightClass?.maxBodyweight;
  // return totalIsPlausible && lifter.bodyweight >= minBodyweight && lifter.bodyweight <= maxBodyweight;
};

export const getYear = (date) => {
  return new Date(date).getUTCFullYear();
};
