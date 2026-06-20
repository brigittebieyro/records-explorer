import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleLoader } from 'react-spinners';
import AllCurrentRecordsView from './components/AllCurrentRecordsView';
import AssociatedPriorRecords from './components/AssociatedPriorRecords';
import OptionsBar from './components/OptionsBar';
import RecordGroup from './components/RecordGroup';
import Standards from './components/Standards';
import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import {
  allTimeStartDate,
  currentRecordsSheetId,
  currentRecordsSheetName,
  endDate,
  getSheetRoute,
  priorRecordsSheetNames,
  wsoName,
  youthAllTimeStartDate,
} from '../Data/RoutesAndSettings';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from '../Data/youthWeightClasses';
import { getAgeGroup, getWeightClassSet } from '../Utils/Utils';
import {
  AgeGroup,
  AgeGroupRecordSet,
  AllCurrentRecordsEntry,
  AllCurrentRecordsGroup,
  PriorRecord,
  StandardRecord,
  StandardsResult,
  WeightClass,
} from '../Utils/types';

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

export function computeHistoricalRecordsForWeightClass(
  weightClass: WeightClass,
  ageGroup: AgeGroup,
  historicalData: string[][]
): PriorRecord[] {
  const records: PriorRecord[] = [];
  historicalData.forEach((row) => {
    if (row.length < 14) return;
    const gender = row[5] === 'F' ? 'female' : 'male';
    if (!row[13] || !row[14]) return;
    const yearSpan = `${new Date(row[0]).getFullYear()} - ${new Date(row[1]).getFullYear()}`;
    const record: PriorRecord = {
      ageGroup: row[4].toUpperCase(),
      gender: gender,
      ageMin: parseInt(row[6]),
      ageMax: parseInt(row[7]),
      bodyWeightMin: parseInt(row[8]),
      bodyWeightMax: parseInt(row[9]),
      lift: row[10],
      weight: row[11],
      lifter: row[12],
      date: row[13],
      event: row[14],
      yearSpan: yearSpan,
    };
    if (
      ageGroup.id === record.ageGroup &&
      weightClass.gender === record.gender &&
      record.bodyWeightMin &&
      record.bodyWeightMax
    ) {
      const classMin = parseInt(weightClass.minBodyweight);
      const classMax = parseInt(weightClass.maxBodyweight);
      if (
        (classMin <= record.bodyWeightMin && classMin >= record.bodyWeightMin) ||
        (classMin <= record.bodyWeightMax && classMax >= record.bodyWeightMax) ||
        (classMin >= record.bodyWeightMin && classMax <= record.bodyWeightMax)
      ) {
        records.push(record);
      }
    }
  });
  return records;
}

export function buildAllCurrentRecords(standards: string[][]): AllCurrentRecordsEntry[] {
  const result: AllCurrentRecordsEntry[] = [];

  // Default weight classes: group all non-youth age groups under each weight class
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

  // Youth age groups: each uses its own weight class set and records are scoped to
  // that specific age group to avoid cross-contamination (U11/U13/U15/U17 share
  // the same weight class IDs and indicators).
  const youthWeightClassSets: Record<string, WeightClass[]> = {
    U11: u11WeightClasses,
    U13: u13WeightClasses,
    U15: u15WeightClasses,
    U17: u17WeightClasses,
  };
  for (const youthAgeGroup of ageGroups.filter((ag) => ag.customWeightClasses)) {
    for (const weightClass of youthWeightClassSets[youthAgeGroup.id] ?? []) {
      const recordSet = computeStandardsForWeightClass(weightClass, standards);
      const ageGroupData = recordSet[youthAgeGroup.id];
      if (!ageGroupData) continue;
      const realRecords: Record<string, StandardRecord> = {};
      Object.entries(ageGroupData.records).forEach(([liftType, record]) => {
        if (record.lifter !== 'STANDARD') {
          realRecords[liftType] = record;
        }
      });
      if (Object.keys(realRecords).length === 0) continue;
      result.push({ weightClass, groups: [{ ageGroup: youthAgeGroup, records: realRecords }] });
    }
  }

  return result;
}

function RecordViewer() {
  const [status, setStatus] = useState<string | undefined>();
  const [currentWeightClass, setCurrentWeightClass] = useState<WeightClass | undefined>();
  const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | undefined>();
  const [localStandards, setLocalStandards] = useState<string[][]>([]);
  const [standardsStatus, setStandardsStatus] = useState<string | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedWeightClass, setSelectedWeightClass] = useState(
    searchParams.get('weightClass') ?? ''
  );
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(searchParams.get('ageGroup') ?? 'OPEN');
  const [displayedStandards, setDisplayedStandards] = useState<StandardsResult>({});
  const [allRecordsData, setAllRecordsData] = useState<AllCurrentRecordsEntry[]>([]);
  const [historicalRecordsData, setHistoricalRecordsData] = useState<string[][]>([]);
  const [historicalRecordsStatus, setHistoricalRecordsStatus] = useState<string | undefined>();
  const [displayedHistoricalRecords, setDisplayedHistoricalRecords] = useState<PriorRecord[]>([]);
  const didAutoRun = useRef(false);

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

  const fetchHistoricalRecords = async (): Promise<void> => {
    if (historicalRecordsStatus) return;
    setHistoricalRecordsStatus('inprogress');
    const allRows: string[][] = [];
    for (const sheetName of priorRecordsSheetNames) {
      try {
        const route = getSheetRoute(currentRecordsSheetId, sheetName);
        const response = await fetch(route, { method: 'GET' });
        if (!response.ok) continue;
        await response.json().then((data: { values: string[][] }) => {
          if (data.values) allRows.push(...data.values);
        });
      } catch {
        // continue on error
      }
    }
    setHistoricalRecordsData(allRows);
    setHistoricalRecordsStatus('complete');
  };
  fetchHistoricalRecords();

  const resetAllData = (): void => {
    setCurrentWeightClass(undefined);
    setCurrentAgeGroup(undefined);
    setDisplayedStandards({});
    setDisplayedHistoricalRecords([]);
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

  // Recompute displayed standards whenever the selected weight class or standards data changes.
  // This covers both normal Go-button flow and auto-triggering from URL params on mount.
  useEffect(() => {
    if (currentWeightClass && localStandards?.length) {
      setDisplayedStandards(computeStandardsForWeightClass(currentWeightClass, localStandards));
    }
  }, [localStandards, currentWeightClass]);

  useEffect(() => {
    if (currentWeightClass && currentAgeGroup && historicalRecordsData.length) {
      setDisplayedHistoricalRecords(
        computeHistoricalRecordsForWeightClass(
          currentWeightClass,
          currentAgeGroup,
          historicalRecordsData
        )
      );
    }
  }, [historicalRecordsData, currentWeightClass, currentAgeGroup]);

  function applySelection(ageGroup: string, weightClass: string): void {
    const ageGroupObj = getAgeGroup(ageGroup);
    const weightClasses = getWeightClassSet(ageGroupObj);
    const wtClass = weightClasses.find((wc) => wc.id === weightClass);
    if (!wtClass) return;
    setStatus('inprogress');
    resetAllData();
    setCurrentWeightClass(wtClass);
    setCurrentAgeGroup(ageGroupObj);
    setStatus('complete');
  }

  async function updateContents(): Promise<void> {
    if (!selectedWeightClass) return;
    const ageGroup = selectedAgeGroup || 'OPEN';
    applySelection(ageGroup, selectedWeightClass);
    setSearchParams({ ageGroup, weightClass: selectedWeightClass });
  }

  // Auto-trigger from URL params on first mount
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    const wc = searchParams.get('weightClass');
    const ag = searchParams.get('ageGroup') ?? 'OPEN';
    if (wc) applySelection(ag, wc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <OptionsBar
        selectedAgeGroup={selectedAgeGroup}
        selectedWeightClass={selectedWeightClass}
        onAgeGroupChange={setSelectedAgeGroup}
        onWeightClassChange={setSelectedWeightClass}
        onGo={updateContents}
        onReset={() => {
          setSelectedAgeGroup('OPEN');
          setSelectedWeightClass('');
          resetAllData();
          setStatus(undefined);
          setSearchParams({});
        }}
        showReset={status === 'complete'}
      />

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
              <p className="page-title">Current Top Athletes</p>
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

            <AssociatedPriorRecords records={displayedHistoricalRecords} />

            <div className="record-group-info">
              <p className="page-title">All time bests from this bodyweight</p>
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

export default RecordViewer;
