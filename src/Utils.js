  export const handleError = (error) => {
    console.log(`An error occurred?`, error)
  }

  export const sortLifts = (lifts, key) => {
      let useKey = key === "date" ? "lift_date" : "total";
  
      if (useKey === "date") {
        return lifts.sort(function (a, b) {
          var keyA = new Date(a[useKey]),
            keyB = new Date(b[useKey]);
          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
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
    }

  export const shouldIncludePastLifter = (lifter, weightClass) => {
    const totalIsPlausible = lifter.total <= 550;
    // Some international events for not have the lifter's bodyweights!
    if (!lifter.bodyweight) {
      return totalIsPlausible;
    }
    const minBodyweight = weightClass?.minBodyweight;
    const maxBodyweight = weightClass?.maxBodyweight;
    return totalIsPlausible && lifter.bodyweight >= minBodyweight && lifter.bodyweight <= maxBodyweight;
  }