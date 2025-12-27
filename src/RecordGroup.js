import { useState, useEffect, useRef } from "react";
import {
  headers,
  getRankingsRoute,
  wsoId,
  getLifterId,
  getLifterDataRoute,
} from "./RoutesAndSettings";
import { handleError, shouldIncludePastLifter, sortLifts } from "./Utils";
import RecordHolder from "./RecordHolder";
import { CircleLoader } from "react-spinners";

function RecordGroup({
  weightClass,
  ageGroup,
  count,
  startDate,
  endDate,
  emptyContent,
}) {
  const [status, setStatus] = useState();
  const [leadingLifters, setLeadingLifters] = useState([]);
  const [newLiftsData, setNewLiftsData] = useState();
  const [combinedLiftsData, setCombinedLiftsData] = useState([]);
  const [sortType, setSortType] = useState("total");

  const sortTypeDescriptions = [
    { id: "total", name: "Overall Total" },
    { id: "best_snatch", name: "Snatch" },
    { id: "best_c&j", name: "Clean and Jerk" },
    { id: "lift_date", name: "Most Recent" },
    // {id: "bodyweight", name: "Bodyweight"},
    // Weight class?
  ];

  const resetAllData = () => {
    setStatus("inprogress");
    setLeadingLifters([]);
    setNewLiftsData();
    setCombinedLiftsData([]);
    setSortType("total");
  };

  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  }

  const prevLifts = usePrevious(newLiftsData);

  useEffect(() => {
    if (weightClass && ageGroup) {
      resetAllData();
      fetchRecordGroup(weightClass, ageGroup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass, ageGroup]);

  useEffect(() => {
    if (!!newLiftsData) {
      let updatedLifts = [...combinedLiftsData, newLiftsData];
      if (prevLifts && !combinedLiftsData.includes(prevLifts)) {
        updatedLifts.push(prevLifts);
      }
      const sortedLifts = sortLifts(updatedLifts, "total");
      setCombinedLiftsData(sortedLifts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLiftsData]);

  const updateSortType = (newType) => {
    console.log(
      "Fetch is complete, proceeding to re-sort lifters",
      combinedLiftsData,
    );
    const newSortedLifts = sortLifts(combinedLiftsData, newType);
    console.log("Updated version:", newSortedLifts);
    setLeadingLifters(newSortedLifts);
    setSortType(newType);
  };

  const fetchRecordGroup = async (wtClass, ageGroup) => {
    try {
      const body = JSON.stringify({
        columns: [],
        filters: {
          date_range_start: startDate,
          date_range_end: endDate,
          weight_class: wtClass.sport80Id,
          wso: wsoId,
          minimum_lifter_age: ageGroup.minimum_lifter_age,
          maximum_lifter_age: ageGroup.maximum_lifter_age,
        },
      });
      const response = await fetch(getRankingsRoute(count), {
        headers,
        body,
        method: "POST",
      });
      if (!response.ok) {
        handleError(response.status);
        throw new Error(`Response status: ${response.status}`);
      }
      await response.json().then(async (response) => {
        let result = [];
        for (let i = 0; i < response.data.length; i++) {
          const lifter = response.data[i];
          if (shouldIncludePastLifter(lifter)) {
            result.push(lifter);
          }
        }
        setLeadingLifters(result);
        setStatus("complete");

        for (let i = 0; i < result.length; i++) {
          await fetchIndividualLifts(result[i]);
        }
      });
    } catch (error) {
      handleError(error);
    }
  };

  const fetchIndividualLifts = async (lifter) => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);
    const specificDate = lifter.lift_date;
    const specificTotal = lifter.total;

    try {
      const response = await fetch(route, {
        headers,
        method: "POST",
      });
      if (!response.ok) {
        // handleError(response.status)
        Promise.resolve();
      }
      await response.json().then((response) => {
        if (response.data.length) {
          let meets = response.data;
          const liftData = meets.find(
            (meet) =>
              meet.date === specificDate && meet.total === specificTotal,
          );
          if (liftData) {
            setNewLiftsData({ ...lifter, ...liftData });
            return Promise.resolve();
          }
        }
      });
    } catch (error) {
      // handleError();
    }
  };

  return (
    <div className="record-viewer-parent">
      {status !== "complete" && <CircleLoader loading={true} color="gold" />}
      {combinedLiftsData.length > 0 && (
        <div className="sort-select-parent">
          Sort{" "}
          <select
            name="sort-selection"
            id="sort-select"
            onChange={(e) => {
              updateSortType(e.target.value);
            }}
            disabled={status !== "complete"}
          >
            {sortTypeDescriptions.map((sort, index) => (
              <option
                value={sort.id}
                key={`sort-selector-${index}-${sort.id}`}
                selected={sortType === sort.id}
              >
                {sort.name}{" "}
              </option>
            ))}
          </select>
        </div>
      )}
      {status === "complete" &&
        !!leadingLifters.length &&
        leadingLifters.map((lifter, index) => (
          <RecordHolder
            lifterData={lifter}
            index={index}
            individualLiftsData={combinedLiftsData}
            sortType={sortType}
          />
        ))}
      {!leadingLifters.length && emptyContent}
    </div>
  );
}

export default RecordGroup;
