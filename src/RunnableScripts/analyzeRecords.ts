import { AgeGroup, LifterRankingData, MeetRecord, WeightClass } from '../Utils/types';
import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import {
  currentRecordsSheetId,
  currentRecordsSheetName,
  endDate,
  getLifterDataRoute,
  getRankingsRoute,
  getSheetRoute,
  headers,
  ineligibleAthletes,
  wsoId,
} from '../Data/RoutesAndSettings';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from '../Data/youthWeightClasses';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const youthWeightClassMap: Record<string, WeightClass[]> = {
  U11: u11WeightClasses,
  U13: u13WeightClasses,
  U15: u15WeightClasses,
  U17: u17WeightClasses,
};

function getWeightClassSetForAgeGroup(ageGroup: AgeGroup): WeightClass[] {
  if (!ageGroup.customWeightClasses) return defaultWeightClasses;
  return youthWeightClassMap[ageGroup.id] ?? defaultWeightClasses;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvField(value: unknown): string {
  const str = String(value ?? '');
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

// ─── API fetching ─────────────────────────────────────────────────────────────

async function fetchCurrentRecords(): Promise<string[][]> {
  const url = getSheetRoute(currentRecordsSheetId, currentRecordsSheetName);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = await response.json();
  if (!data.values) throw new Error('No data in response');
  return data.values;
}

interface CurrentRecord {
  weight: number;
  lifter: string;
  date: string;
}

function parseCurrentRecords(sheetData: string[][]): Record<string, CurrentRecord> {
  const records: Record<string, CurrentRecord> = {};
  sheetData.forEach((row, index) => {
    if (index === 0) return;
    if (!row || row.length < 11) return;
    const [
      ,
      ,
      ageGroupLabel,
      gender,
      ageGroupId,
      ,
      ,
      weightClassIndicator,
      liftType,
      weight,
      lifter,
      ,
      date,
    ] = row;
    if (!liftType || !weight || !lifter) return;
    if (!ageGroupLabel || !gender) return;
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) return;
    const ageKeyRaw = String(ageGroupLabel).toUpperCase();
    const indicator = ageKeyRaw[0];
    const normalizedAgeGroup =
      indicator === 'W' || indicator === 'M' ? String(ageGroupId).toUpperCase() : ageKeyRaw;
    const recordKey = `${gender}_${normalizedAgeGroup}_${weightClassIndicator}_${liftType.toLowerCase()}`;
    if (!records[recordKey] || numWeight > records[recordKey].weight) {
      records[recordKey] = { weight: numWeight, lifter, date: date || '' };
    }
  });
  return records;
}

async function fetchTopAthletes(
  weightClass: WeightClass,
  ageGroup: AgeGroup,
  dateRangeStart: string
): Promise<LifterRankingData[]> {
  const body = JSON.stringify({
    columns: [],
    filters: {
      date_range_start: dateRangeStart,
      date_range_end: endDate,
      weight_class: weightClass.sport80Id,
      wso: wsoId,
      minimum_lifter_age: ageGroup.minimum_lifter_age,
      maximum_lifter_age: ageGroup.maximum_lifter_age,
    },
  });
  try {
    const response = await fetch(getRankingsRoute(5), { method: 'POST', headers, body });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function fetchAthleteLifts(
  lifterId: string,
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<MeetRecord[]> {
  try {
    const response = await fetch(getLifterDataRoute(lifterId), { method: 'POST', headers });
    if (!response.ok) return [];
    const data = await response.json();
    const lifts: MeetRecord[] = data.data || [];
    return lifts.filter(
      (lift) => lift.date && lift.date >= dateRangeStart && lift.date <= dateRangeEnd
    );
  } catch {
    return [];
  }
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

interface BestLift {
  weight: number;
  date: string;
  event: string;
}

interface BestLifts {
  snatch: BestLift | null;
  'clean & jerk': BestLift | null;
  total: BestLift | null;
}

function extractBestLifts(
  athleteData: MeetRecord[],
  weightClass: WeightClass,
  ageGroup: AgeGroup,
  lifter: LifterRankingData
): BestLifts {
  const minBw = parseFloat(weightClass.minBodyweight);
  const maxBw = parseFloat(weightClass.maxBodyweight);
  const ageAtRankingTime = parseInt(lifter.lifter_age);
  const rankingYear = new Date(lifter.lift_date).getFullYear();
  const minYearForLifter = rankingYear - (ageAtRankingTime - parseInt(ageGroup.minimum_lifter_age));
  const maxYearForLifter = rankingYear + (parseInt(ageGroup.maximum_lifter_age) - ageAtRankingTime);

  const bestLifts: BestLifts = { snatch: null, 'clean & jerk': null, total: null };

  for (const lift of athleteData) {
    const bw = parseFloat(String(lift['body_weight_(kg)'] ?? 0));
    const meetYear = new Date(lift.date).getFullYear();
    if (bw < minBw || bw > maxBw) continue;
    if (meetYear < minYearForLifter || meetYear > maxYearForLifter) continue;

    if (lift.best_snatch && (!bestLifts.snatch || lift.best_snatch > bestLifts.snatch.weight)) {
      bestLifts.snatch = { weight: lift.best_snatch, date: lift.date, event: lift.meet ?? '' };
    }
    if (
      lift['best_c&j'] &&
      (!bestLifts['clean & jerk'] || lift['best_c&j'] > bestLifts['clean & jerk'].weight)
    ) {
      bestLifts['clean & jerk'] = {
        weight: lift['best_c&j'],
        date: lift.date,
        event: lift.meet ?? '',
      };
    }
    if (lift.total && (!bestLifts.total || lift.total > bestLifts.total.weight)) {
      bestLifts.total = { weight: lift.total, date: lift.date, event: lift.meet ?? '' };
    }
  }

  return bestLifts;
}

interface RecordBreaker {
  liftType: string;
  athlete: string;
  weight: number;
  weightClass: string;
  ageGroup: string;
  date: string;
  event: string;
  wouldBreak: number | null;
  currentHolder: string | null;
  ageGroupIndex: number;
  weightClassIndex: number;
}

function generateCsv(recordBreakers: RecordBreaker[]): string {
  const liftOrder: Record<string, number> = { snatch: 0, 'clean & jerk': 1, total: 2 };
  const liftLabel: Record<string, string> = {
    snatch: 'Snatch',
    'clean & jerk': 'Clean & Jerk',
    total: 'Total',
  };

  const sorted = [...recordBreakers].sort((breakerA, breakerB) => {
    if (breakerA.ageGroupIndex !== breakerB.ageGroupIndex)
      return breakerA.ageGroupIndex - breakerB.ageGroupIndex;
    if (breakerA.weightClassIndex !== breakerB.weightClassIndex)
      return breakerA.weightClassIndex - breakerB.weightClassIndex;
    return (liftOrder[breakerA.liftType] ?? 99) - (liftOrder[breakerB.liftType] ?? 99);
  });

  const rows = [
    [
      'Age Group',
      'Weight Class',
      'Lift',
      'Athlete',
      'Weight (kg)',
      'Date',
      'Event',
      'Current Record (kg)',
      'Current Holder',
    ],
    ...sorted.map((lift) => [
      lift.ageGroup,
      lift.weightClass,
      liftLabel[lift.liftType] || lift.liftType,
      lift.athlete,
      lift.weight,
      lift.date,
      lift.event,
      lift.wouldBreak ?? '',
      lift.currentHolder || '',
    ]),
  ];

  return rows.map((row) => row.map(csvField).join(',')).join('\n') + '\n';
}

// ─── Exported entry point ─────────────────────────────────────────────────────

const ineligibleSet = new Set(ineligibleAthletes);

export async function runAnalyzeRecords(): Promise<string> {
  const recordBreakers: RecordBreaker[] = [];

  const sheetData = await fetchCurrentRecords();
  const currentRecords = parseCurrentRecords(sheetData);

  for (const ageGroup of ageGroups) {
    const weightClassSet = getWeightClassSetForAgeGroup(ageGroup);
    for (const weightClass of weightClassSet) {
      try {
        const athletes = await fetchTopAthletes(weightClass, ageGroup, weightClass.start);
        for (const athlete of athletes) {
          if (!athlete.action || athlete.action.length === 0) continue;
          if (ineligibleSet.has(athlete.name)) continue;
          if (athlete.total > 550) continue;

          const actionUrl = athlete.action[0].url ?? '';
          const lifterId = actionUrl.split(
            'https://usaweightlifting.sport80.com/public/rankings/member/'
          )[1];
          if (!lifterId) continue;

          const lifts = await fetchAthleteLifts(lifterId, weightClass.start, endDate);
          if (lifts.length === 0) continue;

          const bestLifts = extractBestLifts(lifts, weightClass, ageGroup, athlete);
          const currentYear = new Date().getFullYear();

          for (const [liftType, liftData] of Object.entries(bestLifts)) {
            if (!liftData) continue;
            if (new Date(liftData.date).getFullYear() !== currentYear) continue;

            const genderKey = weightClass.gender === 'female' ? 'F' : 'M';
            const wcKey =
              weightClass.maxBodyweight === '1000'
                ? '>' + parseInt(weightClass.minBodyweight)
                : weightClass.maxBodyweight;
            const recordKey = `${genderKey}_${ageGroup.id}_${wcKey}_${liftType}`;
            const currentRecord = currentRecords[recordKey];

            if (currentRecord && liftData.weight > currentRecord.weight) {
              recordBreakers.push({
                liftType,
                athlete: athlete.name || 'Unknown',
                weight: liftData.weight,
                weightClass: weightClass.name,
                ageGroup: ageGroup.name,
                date: liftData.date || '',
                event: liftData.event || '',
                wouldBreak: currentRecord.weight,
                currentHolder: currentRecord.lifter,
                ageGroupIndex: ageGroups.indexOf(ageGroup),
                weightClassIndex: weightClassSet.indexOf(weightClass),
              });
            }
          }
        }

        await delay(100);
      } catch {
        // continue on error
      }
    }
  }

  return generateCsv(recordBreakers);
}
