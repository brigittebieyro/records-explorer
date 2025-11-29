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