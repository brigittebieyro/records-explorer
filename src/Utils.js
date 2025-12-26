import { ageGroups } from "./Data/ageGroups";
import { defaultWeightClasses } from "./Data/defaultWeightClasses";
import { u11WeightClasses, u13WeightClasses } from "./Data/youthWeightClasses";

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
  console.log(`Could not find custom weight classes for ${ageGroup.id}`);
  return defaultWeightClasses;
};

export const handleError = (error) => {
  console.log(`An error occurred?`, error);
};

export const sortLifts = (lifts, key) => {
  let useKey = key || "total"; // === "date" ? "lift_date" : "total";
  console.log("sorting by ", key);
  if (useKey === "lift_date") {
    return lifts.sort(function (a, b) {
      var keyA = new Date(a[useKey]),
        keyB = new Date(b[useKey]);
      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return 0;
    });
  } else {
    return lifts.sort(function (a, b) {
      var keyA = parseInt(a[useKey]),
        keyB = parseInt(b[useKey]);
      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return 0;
    });
  }
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
