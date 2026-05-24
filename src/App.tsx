import './App.css';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CircleLoader } from 'react-spinners';
import AllCurrentRecordsView from './AllCurrentRecordsView';
import { ageGroups } from './Data/ageGroups';
import { defaultWeightClasses } from './Data/defaultWeightClasses';
import Header from './Header';
import Info from './Info';
import RecordGroup from './RecordGroup';
import {
  allTimeStartDate,
  currentRecordsSheetId,
  currentRecordsSheetName,
  endDate,
  getSheetRoute,
  wsoName,
  youthAllTimeStartDate,
} from './RoutesAndSettings';
import Standards from './Standards';
import { getAgeGroup, getWeightClassSet } from './Utils';
import {
  AgeGroup,
  AgeGroupRecordSet,
  AllCurrentRecordsEntry,
  AllCurrentRecordsGroup,
  StandardRecord,
  StandardsResult,
  WeightClass,
} from './types';

export function computeStandardsForWeightClass(
  weightClass: WeightClass,
  standards: string[][]
): StandardsResult {
  const recordSet: StandardsResult = {};
  let weightClassIndicator: string = weightClass.maxBodyweight;
  if (parseFloat(weightClass.maxBodyweight) > 200) {
    weightClassIndicator = `>${parseInt(weightClass.minBodyweight)}`;
  }
  standards.forEach((standard) => {
    if (standard[7] === weightClassIndicator) {
      const ageKey = String(standard[2]).toUpperCase();
      const indicator = ageKey[0];
      const recordKey = indicator === 'W' || indicator === 'M' ? standard[4] : ageKey;
      const genderKey = standard[3];
      if (
        (weightClass.gender === 'female' && genderKey === 'F') ||
        (weightClass.gender === 'male' && genderKey === 'M')
      ) {
        if (!recordSet[recordKey]) {
          recordSet[recordKey] = {
            ageGroup: ageKey,
            weightClass: standard[7],
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
  });
  return recordSet;
}

export function buildAllCurrentRecords(standards: string[][]): AllCurrentRecordsEntry[] {
  const result: AllCurrentRecordsEntry[] = [];
  for (const weightClass of defaultWeightClasses) {
    const recordSet = computeStandardsForWeightClass(weightClass, standards);
    const groups: AllCurrentRecordsGroup[] = [];
    for (const ageGroup of ageGroups) {
      const ageGroupData = recordSet[ageGroup.id];
      if (!ageGroupData) continue;
      const realRecords: Record<string, StandardRecord> = {};
      Object.entries(ageGroupData.records).forEach(([liftType, record]) => {
        if (record.lifter !== 'STANDARD') {
          realRecords[liftType] = record;
        }
      });
      if (Object.keys(realRecords).length === 0) continue;
      groups.push({ ageGroup, records: realRecords });
    }
    if (groups.length > 0) {
      result.push({ weightClass, groups });
    }
  }
  return result;
}

function MainPage() {
  const [status, setStatus] = useState<string | undefined>();
  const [currentWeightClass, setCurrentWeightClass] = useState<WeightClass | undefined>();
  const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | undefined>();
  const [localStandards, setLocalStandards] = useState<string[][]>([]);
  const [standardsStatus, setStandardsStatus] = useState<string | undefined>();
  const [selectedWeightClass, setSelectedWeightClass] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('OPEN');
  const [displayedStandards, setDisplayedStandards] = useState<StandardsResult>({});
  const [allRecordsData, setAllRecordsData] = useState<AllCurrentRecordsEntry[]>([]);

  const fetchCurrentStandards = async (): Promise<void> => {
    if (standardsStatus) {
      return;
    }
    setStandardsStatus('inprogress');
    const route = getSheetRoute(currentRecordsSheetId, currentRecordsSheetName);

    try {
      const response = await fetch(route, {
        method: 'GET',
      });
      if (!response.ok) {
        setStandardsStatus('error');
        Promise.resolve();
      }
      await response.json().then((response: { values: string[][] }) => {
        setLocalStandards(response.values);
        setStandardsStatus('complete');
      });
    } catch (error) {
      setStandardsStatus('error');
    }
  };
  fetchCurrentStandards();

  const resetAllData = (): void => {
    setCurrentWeightClass(undefined);
    setCurrentAgeGroup(undefined);
    setDisplayedStandards({});
  };

  useEffect(() => {
    if (!!selectedAgeGroup && !!selectedWeightClass) {
      const ageGroupObj = getAgeGroup(selectedAgeGroup);
      const weightClasses = getWeightClassSet(ageGroupObj);
      const selectedWeightClassObj = weightClasses.find(
        (wtClass) => wtClass.id === selectedWeightClass
      );
      if (!selectedWeightClassObj) {
        // Intentional: clearing the weight class when switching age groups is expected
        // behavior — the new age group may not share the same weight classes.
        setSelectedWeightClass('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgeGroup]);

  useEffect(() => {
    if (localStandards?.length) {
      setAllRecordsData(buildAllCurrentRecords(localStandards));
    }
  }, [localStandards]);

  const updateDisplayedStandards = async (weightClass: WeightClass): Promise<void> => {
    if (!!weightClass && localStandards?.length) {
      setDisplayedStandards(computeStandardsForWeightClass(weightClass, localStandards));
    }
  };

  async function updateContents(): Promise<void> {
    if (!selectedWeightClass) {
      return;
    }
    const currentAge = getAgeGroup(selectedAgeGroup || 'OPEN');
    const weightClasses = getWeightClassSet(currentAge);
    const currentWtClass = weightClasses.find((wtClass) => wtClass.id === selectedWeightClass);

    if (!currentWtClass) {
      return;
    }

    setStatus('inprogress');
    resetAllData();

    updateDisplayedStandards(currentWtClass);
    setCurrentWeightClass(currentWtClass);
    setCurrentAgeGroup(currentAge);
    setStatus('complete');
  }

  return (
    <div className="App">
      <div className="record-viewer-options-bar">
        <span>Select a weight class & group: </span>
        <select
          aria-label="Age Group"
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
          aria-label="Weight Class"
          className="header-button"
          name="weight-class"
          id="weight-class-select"
          value={selectedWeightClass}
          onChange={(e) => {
            setSelectedWeightClass(e.target.value);
          }}
        >
          {!selectedWeightClass && <option value="">Select a Weight Class</option>}
          {getWeightClassSet(getAgeGroup(selectedAgeGroup)).map((wtClass, index) => (
            <option value={wtClass.id} key={`wtClass-selector-${index}-${wtClass.id}`}>
              {wtClass.name}
            </option>
          ))}
        </select>

        <button
          className="header-button"
          onClick={updateContents}
          disabled={!selectedAgeGroup || !selectedWeightClass}
        >
          Go
        </button>

        {status === 'complete' && (
          <button
            className="header-button reset-button"
            onClick={() => {
              setSelectedAgeGroup('OPEN');
              setSelectedWeightClass('');
              resetAllData();
              setStatus(undefined);
            }}
          >
            Reset
          </button>
        )}
      </div>

      {!status && <AllCurrentRecordsView data={allRecordsData} />}

      {status === 'inprogress' && (
        <div className="records-viewer-loading-container">
          <CircleLoader loading={true} color="gold" />
        </div>
      )}

      {status === 'complete' && (
        <div className="record-viewer-results-parent">
          <div className="current-leaders-group">
            <div className="record-group-info">
              <p className="record-group-title">Current Top Athletes</p>
              <p className="record-group-description">
                These are the {wsoName} WSO's top ranked lifters in the current{' '}
                <strong>{currentWeightClass!.name}</strong> weight class, active{' '}
                <strong>
                  from {new Date(currentWeightClass!.start).getUTCFullYear()}, originally fetched by
                  total.
                </strong>
              </p>
            </div>
            <RecordGroup
              weightClass={currentWeightClass!}
              ageGroup={currentAgeGroup!}
              count={5}
              startDate={currentWeightClass!.start}
              endDate={endDate}
              emptyContent={
                <div>Looks like nobody's competed in this division yet! Could be you?</div>
              }
            />
          </div>

          <div className="combined-history-group">
            <Standards
              relevantRecords={
                displayedStandards[currentAgeGroup!.id] as AgeGroupRecordSet | undefined
              }
              weightClassName={currentWeightClass!.name}
              ageGroupName={currentAgeGroup!.name}
            />

            <div className="record-group-info">
              <p className="record-group-title">All time bests from this bodyweight</p>
              <p className="record-group-description">
                What if the current weight class were active earlier? Who would hold our all time
                records? Here are the top lifters by total in overlapping weight classes, prior to{' '}
                {new Date(currentWeightClass!.start).getUTCFullYear()}.
              </p>
            </div>
            <RecordGroup
              weightClass={currentWeightClass!}
              ageGroup={currentAgeGroup!}
              count={12}
              startDate={
                currentAgeGroup!.id === 'U11' || currentAgeGroup!.id === 'U13'
                  ? youthAllTimeStartDate
                  : allTimeStartDate
              }
              endDate={endDate}
              emptyContent={<div>No history found for this age division and weight class.</div>}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/info" element={<Info />} />
      </Routes>
    </BrowserRouter>
  );
}
