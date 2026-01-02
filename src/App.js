import "./App.css";
import { useEffect, useState } from "react";
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
import { getAgeGroup, getWeightClassSet } from "./Utils";
import Standards from "./Standards";
import RecordGroup from "./RecordGroup";
import Header from "./Header";

function App() {
  const [status, setStatus] = useState();
  const [currentWeightClass, setCurrentWeightClass] = useState();
  const [currentAgeGroup, setCurrentAgeGroup] = useState();
  const [localStandards, setLocalStandards] = useState([]);
  const [standardsStatus, setStandardsStatus] = useState();
  const [selectedWeightClass, setSelectedWeightClass] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("OPEN");
  const [displayedStandards, setDisplayedStandards] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

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
    setCurrentAgeGroup();
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

  async function updateContents(event) {
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

  const getMenuStyles = () => {
    let styles = "menu-flyout";
    if (!menuVisible) {
      styles += " hidden";
    }
    return styles;
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  return (
    <div className="App">
      <Header />

      <div className="record-viewer-options-bar">
        <span>Select a weight class & group: </span>
        <select
          className="header-button"
          name="age-group"
          id="age-group-select"
          onChange={(e) => {
            setSelectedAgeGroup(e.target.value);
          }}
        >
          {ageGroups.map((group, index) => (
            <option
              value={group.id}
              key={`ageGroup-selector-${index}-${group.id}`}
              disabled={group.disabled}
              selected={group.id === selectedAgeGroup}
            >
              {group.name}
            </option>
          ))}
        </select>

        <select
          className="header-button"
          name="weight-class"
          id="weight-class-select"
          onChange={(e) => {
            setSelectedWeightClass(e.target.value);
          }}
        >
          {!selectedWeightClass && (
            <option value="">Select a Weight Class</option>
          )}
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
          className="header-button"
          onClick={updateContents}
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
        <div className="record-viewer-results-parent">
          <div className="current-leaders-group">
            <div className="record-group-info">
              <p className="record-group-title">Current Top Athletes</p>
              <p className="record-group-description">
                These are the {wsoName} WSO's top ranked lifters in the current{" "}
                <strong>{currentWeightClass.name}</strong> weight class, active{" "}
                <strong>
                  from {new Date(currentWeightClass.start).getUTCFullYear()},
                  originally fetched by total.
                </strong>
              </p>
            </div>
            <RecordGroup
              weightClass={currentWeightClass}
              ageGroup={currentAgeGroup}
              count={5}
              startDate={currentWeightClass.start}
              endDate={endDate}
              emptyContent={
                <div>
                  Looks like nobody's competed in this division yet! Could be
                  you?
                </div>
              }
            />
          </div>

          <div className="combined-history-group">
            <Standards
              relevantRecords={displayedStandards[currentAgeGroup.id]}
              weightClassName={currentWeightClass.name}
              ageGroupName={currentAgeGroup.name}
            />

            <div className="record-group-info">
              <p className="record-group-title">
                All time bests from this bodyweight
              </p>
              <p className="record-group-description">
                What if the current weight class were active earlier? Who would
                hold our all time records? Here are the top lifters by total in
                overlapping weight classes, prior to{" "}
                {new Date(currentWeightClass.start).getUTCFullYear()}.
              </p>
            </div>
            <RecordGroup
              weightClass={currentWeightClass}
              ageGroup={currentAgeGroup}
              count={12}
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
      )}
    </div>
  );
}

export default App;
