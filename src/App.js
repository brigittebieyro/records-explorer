import "./App.css";
import { useEffect, useState, useRef } from "react";
import { ageGroups } from "./Data/ageGroups";
import { CircleLoader } from "react-spinners";
import {
  endDate,
  allTimeStartDate,
  getSheetRoute,
  currentRecordsSheetId,
  currentRecordsSheetName,
  wsoName,
} from "./RoutesAndSettings";
import { getAgeGroup, getWeightClassSet, sortLifts } from "./Utils";
import Standards from "./Standards";
import RecordGroup from "./RecordGroup";

function App() {
  const [status, setStatus] = useState();
  const [currentWeightClass, setCurrentWeightClass] = useState();
  const [currentAgeGroup, setCurrentAgeGroup] = useState();
  const [priorGroups, setPriorGroups] = useState([]);
  const [combinedPriorGroups, setCombinedPriorGroups] = useState([]);
  const [currentLeaders, setCurrentLeaders] = useState([]);
  const [localStandards, setLocalStandards] = useState([]);
  const [standardsStatus, setStandardsStatus] = useState();
  const [selectedWeightClass, setSelectedWeightClass] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [newLiftsData, setNewLiftsData] = useState();
  const [combinedLiftsData, setCombinedLiftsData] = useState([]);
  const [newPriorLiftsData, setNewPriorLiftsData] = useState();
  const [combinedPriorLiftsData, setCombinedPriorLiftsData] = useState([]);
  const [displayedStandards, setDisplayedStandards] = useState([]);

  const fetchCurrentStandards = async () => {
    if (standardsStatus) {
      return;
    }
    setStandardsStatus("inprogress");
    const route = getSheetRoute(currentRecordsSheetId, currentRecordsSheetName);

    try {
      const response = await fetch(route, {
        method: "GET",
      });
      if (!response.ok) {
        setStandardsStatus("error");
        Promise.resolve();
      }
      await response.json().then((response) => {
        setLocalStandards(response.values);
        setStandardsStatus("complete");
      });
    } catch (error) {
      setStandardsStatus("error");
    }
  };
  fetchCurrentStandards();

  const resetAllData = () => {
    setCurrentWeightClass();
    setCurrentLeaders([]);
    setCurrentAgeGroup();
    setPriorGroups([]);
    setCombinedPriorGroups([]);
    setNewLiftsData();
    setCombinedLiftsData([]);
    setNewPriorLiftsData();
    setCombinedPriorLiftsData([]);
    setDisplayedStandards([]);
  };

  useEffect(() => {
    if (!!selectedAgeGroup && !!selectedWeightClass) {
      const ageGroupObj = getAgeGroup(selectedAgeGroup);
      const weightClasses = getWeightClassSet(ageGroupObj);
      const selectedWeightClassObj = weightClasses.find(
        (wtClass) => wtClass.id === selectedWeightClass,
      );
      if (!selectedWeightClassObj) {
        setSelectedWeightClass("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgeGroup]);

  useEffect(() => {
    if (priorGroups.length) {
      const sortedCombinedGroups = sortLifts(
        [...priorGroups, ...combinedPriorGroups],
        "total",
      );
      setCombinedPriorGroups(sortedCombinedGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorGroups]);

  useEffect(() => {
    if (!!newLiftsData) {
      const sortedLifts = sortLifts(
        [...combinedLiftsData, newLiftsData],
        "total",
      );
      setCombinedLiftsData(sortedLifts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLiftsData]);

  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  }

  const prevPastLifts = usePrevious(newPriorLiftsData);

  useEffect(() => {
    if (!!newPriorLiftsData) {
      const prevLifts = prevPastLifts;
      const updatedPreviousLifts = [...combinedPriorLiftsData];
      if (!updatedPreviousLifts.includes(prevLifts)) {
        updatedPreviousLifts.push(prevLifts);
      }
      updatedPreviousLifts.push(newPriorLiftsData);
      setCombinedPriorLiftsData(updatedPreviousLifts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPriorLiftsData]);

  const updateDisplayedStandards = async (weightClass, ageGroup) => {
    if (!!weightClass && localStandards.length) {
      let recordSet = {};

      let weightClassIndicator = weightClass.maxBodyweight;
      if (weightClass.maxBodyweight > 100) {
        weightClassIndicator = `>${parseInt(weightClass.minBodyweight)}`;
      }
      localStandards.filter((standard) => {
        if (standard[7] === weightClassIndicator) {
          const ageKey = String(standard[2]).toUpperCase();
          const indicator = ageKey[0];
          let recordKey =
            indicator === "W" || indicator === "M" ? standard[4] : ageKey;
          const genderKey = standard[3];
          if (
            (weightClass.gender === "female" && genderKey === "F") ||
            (weightClass.gender === "male" && genderKey === "M")
          ) {
            let weightClassKey = standard[7];
            if (!recordSet[recordKey]) {
              recordSet[recordKey] = {
                ageGroup: ageKey,
                weightClass: weightClassKey,
                records: {},
              };
            }

            recordSet[recordKey].records[standard[8]] = {
              weight: standard[9],
              lifter: standard[10],
              event: standard[11],
              date: standard[12],
            };
          }
        }
        return true;
      });
      setDisplayedStandards(recordSet);
    }
  };

  async function getData(event) {
    if (!selectedWeightClass) {
      // TODO handle error
      return;
    }
    const currentAge = getAgeGroup(selectedAgeGroup || "OPEN");
    const weightClasses = getWeightClassSet(currentAge);
    const currentWtClass = weightClasses.find(
      (wtClass) => wtClass.id === selectedWeightClass,
    );

    if (!currentWtClass) {
      // TODO handle error
      return;
    }

    setStatus("inprogress");
    resetAllData();

    updateDisplayedStandards(currentWtClass, selectedAgeGroup);
    setCurrentWeightClass(currentWtClass);
    setCurrentAgeGroup(currentAge);
    setStatus("complete");
  }

  const renderData = (
    currentRankings,
    currentLifts,
    priorClassRecords,
    priorClassLifts,
    allTimeMagicGroup,
    allTimeMagicLiftsData,
  ) => {
    return (
      <div>
        <Standards
          relevantRecords={displayedStandards[currentAgeGroup.id]}
          weightClassName={currentWeightClass.name}
          ageGroupName={currentAgeGroup.name}
        />

        <div>
          <h3>Leading Athletes by Total</h3>
          <p>
            These are the top three results in the current{" "}
            <strong>{currentWeightClass.name}</strong> weight class, active{" "}
            <strong>
              from {new Date(currentWeightClass.start).getUTCFullYear()}, by
              total.
            </strong>
          </p>
          <RecordGroup
            weightClass={currentWeightClass}
            ageGroup={currentAgeGroup}
            count={3}
            startDate={currentWeightClass.start}
            endDate={endDate}
            emptyContent={
              <div>
                Looks like nobody's competed in this division yet! Could be you?
              </div>
            }
          />
        </div>

        <div>
          <h3>All time bests from this bodyweight</h3>
          <p>
            What if the current weight class were active earlier? Who would hold
            our all time records? Here are the top lifters by total in
            overlapping weight classes, prior to{" "}
            {new Date(currentWeightClass.start).getUTCFullYear()}.
          </p>
          <RecordGroup
            weightClass={currentWeightClass}
            ageGroup={currentAgeGroup}
            count={20}
            startDate={allTimeStartDate}
            endDate={endDate}
            emptyContent={
              <div>
                No history found for this age division and weight class.
              </div>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <img
          className="header-logo"
          src="/WSOLogo.png"
          width="100"
          height="100"
        />
        {wsoName} WSO Records Explorer
      </header>

      <div className="record-viewer-options-bar">
        <select
          name="age-group"
          id="age-group-select"
          onChange={(e) => {
            setSelectedAgeGroup(e.target.value);
          }}
        >
          <option value="">Select an Age Group</option>)
          {ageGroups.map((group, index) => (
            <option
              value={group.id}
              key={`ageGroup-selector-${index}-${group.id}`}
              disabled={group.disabled}
            >
              {group.name}
            </option>
          ))}
        </select>

        <select
          name="weight-class"
          id="weight-class-select"
          onChange={(e) => {
            setSelectedWeightClass(e.target.value);
          }}
        >
          <option value="">Select a Weight Class</option>)
          {getWeightClassSet(getAgeGroup(selectedAgeGroup)).map(
            (wtClass, index) => (
              <option
                value={wtClass.id}
                key={`wtClass-selector-${index}-${wtClass.id}`}
              >
                {wtClass.name}
              </option>
            ),
          )}
        </select>

        <button
          onClick={getData}
          disabled={!selectedAgeGroup || !selectedWeightClass}
        >
          Go
        </button>
      </div>

      {status === "inprogress" && (
        <div className="records-viewer-loading-container">
          <CircleLoader loading={true} color="gold" />
        </div>
      )}

      {status === "complete" && (
        <div className="records-viewer-data-container">
          {renderData(
            currentLeaders,
            combinedLiftsData,
            combinedPriorGroups,
            combinedPriorLiftsData,
          )}
        </div>
      )}
    </div>
  );
}

export default App;
