import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import {
  adaptiveAllRecordsSheetName,
  adaptiveLiftersListSheetId,
  adaptiveLiftersListSheetName,
  adptiveCategoryRecordsSheetNames,
  allTimeStartDate,
  currentRecordsSheetId,
  endDate,
  getLifterDataRoute,
  getLifterId,
  getRankingsRoute,
  getSheetRoute,
  headers,
} from '../Data/RoutesAndSettings';
import {
  csvField,
  getWeightClassSet,
  getYear,
  isWithinPlausibilityCaps,
  normalizeSheetAgeGroup,
  rateLimitedFetch,
} from '../Utils/Utils';
import { AgeGroup, LifterRankingData, MeetRecord, WeightClass } from '../Utils/types';

// The record sheets name the three lifts exactly this way, so these strings are both the
// sheet lookup key and the CSV label.
const liftLabels = ['Snatch', 'Clean & Jerk', 'Total'] as const;
type LiftLabel = (typeof liftLabels)[number];

// Adaptive_All applies to everyone on the roster; the category sheets apply only to the
// athletes flagged for them. An athlete may be flagged for several.
const allCategorySheetNames = [adaptiveAllRecordsSheetName, ...adptiveCategoryRecordsSheetNames];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdaptiveLifter {
  name: string;
  usawNumber: string;
  startDate: string;
  weightClassName: string;
  categorySheetNames: string[];
}

interface ResolvedLifter extends AdaptiveLifter {
  lifterId: string;
  birthYear: number;
  gender: string;
}

interface AdaptiveRecord {
  bodyWeightMin: number;
  bodyWeightMax: number;
  bodyWeightMaxIsOpen: boolean;
  weight: number;
  holder: string;
  ageGroupLabel: string;
}

// sheet name -> `${ageGroupId}_${gender}_${lift}` -> the classes recorded for that slot.
type AdaptiveRecordIndex = Record<string, Record<string, AdaptiveRecord[]>>;

interface AdaptiveRecordBreaker {
  category: string;
  weightClassName: string;
  ageGroupLabel: string;
  bodyweight: number;
  lift: LiftLabel;
  weight: number;
  lifterName: string;
  date: string;
  event: string;
  usawNumber: string;
  previousRecord: number;
  previousHolder: string;
  categoryIndex: number;
  ageGroupIndex: number;
  weightClassIndex: number;
  liftIndex: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The roster sheet is fed by a Google Form, which writes dates as M/D/YYYY. Everything
// else in the codebase compares dates as ISO strings.
export function parseSheetDate(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split('/');
  if (parts.length !== 3) return '';
  const [month, day, year] = parts.map((part) => parseInt(part, 10));
  if (isNaN(month) || isNaN(day) || isNaN(year)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isTrue(value: string): boolean {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .startsWith('TRUE');
}

// Columns are located by header text rather than by index so that the script keeps working
// as the survey behind the roster sheet gains or loses questions.
export function parseAdaptiveRoster(sheetData: string[][]): AdaptiveLifter[] {
  if (!sheetData || sheetData.length < 2) return [];
  const header = sheetData[0].map((cell) => String(cell ?? ''));
  const find = (pattern: RegExp): number => header.findIndex((cell) => pattern.test(cell));

  const nameIndex = find(/name/i);
  const usawIndex = find(/usaw/i);
  const startIndex = find(/start/i);
  const weightClassIndex = find(/weight ?class/i);
  if (nameIndex === -1 || usawIndex === -1) return [];

  // The category flags are the unlabelled columns holding nothing but TRUE/FALSE, in sheet
  // order — the same order as adptiveCategoryRecordsSheetNames. Testing the values rather
  // than just taking every leftover column means an unrecognized column the survey picks up
  // (a preferred email, say) cannot shift the flags out of alignment.
  const labelled = new Set([nameIndex, usawIndex, startIndex, weightClassIndex]);
  const isFlagColumn = (index: number): boolean => {
    const values = sheetData
      .slice(1)
      .map((row) =>
        String(row?.[index] ?? '')
          .trim()
          .toUpperCase()
      )
      .filter((value) => value !== '');
    return values.length > 0 && values.every((value) => value === 'TRUE' || value === 'FALSE');
  };
  const categoryIndexes = header
    .map((_unused, index) => index)
    .filter((index) => !labelled.has(index) && isFlagColumn(index));

  const lifters: AdaptiveLifter[] = [];
  for (const row of sheetData.slice(1)) {
    if (!row) continue;
    const usawNumber = String(row[usawIndex] ?? '').trim();
    // The sheet carries a long tail of blank rows with FALSE in every flag column.
    if (!usawNumber) continue;
    const categorySheetNames = adptiveCategoryRecordsSheetNames.filter((_unused, categoryPosition) => {
      const column = categoryIndexes[categoryPosition];
      return column !== undefined && isTrue(row[column]);
    });
    lifters.push({
      name: String(row[nameIndex] ?? '').trim(),
      usawNumber,
      startDate: startIndex === -1 ? '' : parseSheetDate(row[startIndex]),
      weightClassName: weightClassIndex === -1 ? '' : String(row[weightClassIndex] ?? '').trim(),
      categorySheetNames,
    });
  }
  return lifters;
}

export function parseAdaptiveRecords(sheetData: string[][]): Record<string, AdaptiveRecord[]> {
  const index: Record<string, AdaptiveRecord[]> = {};
  sheetData.forEach((row, rowNumber) => {
    if (rowNumber === 0) return;
    if (!row || row.length < 11) return;
    const [, , ageGroupLabel, gender, , , bodyWeightMin, bodyWeightMax, lift, record, holder] = row;
    if (!ageGroupLabel || !gender || !lift) return;

    // The top class of every set is written '>86' rather than as a number.
    const rawMax = String(bodyWeightMax).trim();
    const bodyWeightMaxIsOpen = rawMax.startsWith('>');
    const parsedMin = parseFloat(bodyWeightMin);
    const parsedMax = parseFloat(bodyWeightMaxIsOpen ? rawMax.slice(1) : rawMax);
    if (isNaN(parsedMin) || isNaN(parsedMax)) return;

    const key = `${normalizeSheetAgeGroup(ageGroupLabel)}_${gender}_${lift}`;
    if (!index[key]) index[key] = [];
    index[key].push({
      bodyWeightMin: parsedMin,
      bodyWeightMax: parsedMax,
      bodyWeightMaxIsOpen,
      weight: parseFloat(record) || 0,
      holder: holder || '',
      ageGroupLabel: String(ageGroupLabel),
    });
  });
  return index;
}

function findRecord(
  index: Record<string, AdaptiveRecord[]>,
  ageGroup: AgeGroup,
  gender: string,
  lift: LiftLabel,
  bodyweight: number
): AdaptiveRecord | undefined {
  const candidates = index[`${ageGroup.id}_${gender}_${lift}`];
  if (!candidates) return undefined;
  // Sheet classes are contiguous, so the lower bound is exclusive and the upper inclusive.
  return candidates.find(
    (candidate) =>
      bodyweight > candidate.bodyWeightMin &&
      (candidate.bodyWeightMaxIsOpen || bodyweight <= candidate.bodyWeightMax)
  );
}

// Every set holds both genders, and the men's and women's bands overlap (72.5kg is both a
// Women's 77kg and a Men's 75kg bodyweight), so the set must be narrowed before matching.
export function findWeightClass(
  ageGroup: AgeGroup,
  bodyweight: number,
  gender: string
): { weightClass: WeightClass; index: number } | undefined {
  const genderKey = gender === 'F' ? 'female' : 'male';
  const set = getWeightClassSet(ageGroup).filter((weightClass) => weightClass.gender === genderKey);
  const index = set.findIndex(
    (weightClass) =>
      bodyweight >= parseFloat(weightClass.minBodyweight) &&
      bodyweight <= parseFloat(weightClass.maxBodyweight)
  );
  return index === -1 ? undefined : { weightClass: set[index], index };
}

// Sporting age is defined by calendar year, so the birth year is all that is needed and
// the result is exact.
export function eligibleAgeGroups(sportingAge: number): AgeGroup[] {
  return ageGroups.filter(
    (ageGroup) =>
      sportingAge >= parseInt(ageGroup.minimum_lifter_age) &&
      sportingAge <= parseInt(ageGroup.maximum_lifter_age)
  );
}

// The roster names the class by its display name ("Women's 77kg"), not its id ("W77").
function genderFromWeightClassName(weightClassName: string): string | undefined {
  const weightClass = defaultWeightClasses.find((candidate) => candidate.name === weightClassName);
  if (!weightClass) return undefined;
  return weightClass.gender === 'female' ? 'F' : 'M';
}

// Every class searched is a request, so the order matters. An athlete who has moved is
// nearly always within a class or two of the one they gave, so widen outwards from it one
// step at a time — heavier, lighter, heavier, lighter — and stay inside their own gender,
// which halves the classes worth looking at.
//
// The youth sets are deliberately not searched: the lightest adult class has no lower
// bodyweight bound, so even the smallest youth lifter surfaces in it. This only affects
// finding the athlete — youth age-group records are still matched and reported, via the
// age groups in collectRecordBreakers.
export function classSearchOrder(weightClassName: string): WeightClass[] {
  const chosen = defaultWeightClasses.find((candidate) => candidate.name === weightClassName);
  // Nothing to widen out from, so fall back to looking in every adult class.
  if (!chosen) return defaultWeightClasses;

  // defaultWeightClasses lists each gender's classes together in ascending order, so
  // neighbours in the filtered list are neighbours by bodyweight.
  const sameGender = defaultWeightClasses.filter((candidate) => candidate.gender === chosen.gender);
  const start = sameGender.indexOf(chosen);

  const ordered: WeightClass[] = [chosen];
  for (let step = 1; step < sameGender.length; step++) {
    const heavier = sameGender[start + step];
    const lighter = sameGender[start - step];
    if (heavier) ordered.push(heavier);
    if (lighter) ordered.push(lighter);
  }
  return ordered;
}

// ─── API fetching ─────────────────────────────────────────────────────────────

async function fetchSheet(sheetId: string, sheetName: string): Promise<string[][]> {
  const response = await rateLimitedFetch(getSheetRoute(sheetId, sheetName));
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = await response.json();
  if (!data.values) throw new Error(`No data in ${sheetName}`);
  return data.values;
}

async function searchRankings(
  name: string,
  weightClass: WeightClass
): Promise<LifterRankingData[]> {
  const body = JSON.stringify({
    columns: [],
    filters: {
      date_range_start: allTimeStartDate,
      date_range_end: endDate,
      weight_class: weightClass.sport80Id,
    },
  });
  try {
    const response = await rateLimitedFetch(getRankingsRoute(500, name), {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function fetchLifterResults(lifterId: string, startDate: string): Promise<MeetRecord[]> {
  try {
    const response = await rateLimitedFetch(getLifterDataRoute(lifterId), {
      method: 'POST',
      headers,
    });
    if (!response.ok) return [];
    const data = await response.json();
    const results: MeetRecord[] = data.data || [];
    return results.filter(
      (result) =>
        result.date &&
        result.date >= startDate &&
        result.date <= endDate &&
        isWithinPlausibilityCaps(result)
    );
  } catch {
    return [];
  }
}

// A name search alone is not enough — searching 'Fernandes' returns several different
// lifters — so the membership number is what actually identifies the athlete.
export async function resolveLifter(lifter: AdaptiveLifter): Promise<ResolvedLifter | undefined> {
  for (const weightClass of classSearchOrder(lifter.weightClassName)) {
    const rows = await searchRankings(lifter.name, weightClass);
    const matches = rows.filter((row) => String(row.membership ?? '') === lifter.usawNumber);
    if (matches.length === 0) continue;

    const mostRecent = matches.reduce((latest, row) =>
      row.lift_date > latest.lift_date ? row : latest
    );
    if (!mostRecent.action || mostRecent.action.length === 0) continue;
    const lifterId = getLifterId(mostRecent.action);
    if (!lifterId) continue;

    const lifterAge = parseInt(String(mostRecent.lifter_age));
    if (isNaN(lifterAge)) continue;

    return {
      ...lifter,
      lifterId,
      birthYear: getYear(mostRecent.lift_date) - lifterAge,
      gender: genderFromWeightClassName(lifter.weightClassName) ?? mostRecent.gender ?? '',
    };
  }
  return undefined;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function liftsFromResult(result: MeetRecord): Array<{ lift: LiftLabel; weight: number }> {
  const values: Array<{ lift: LiftLabel; weight: number | undefined }> = [
    { lift: 'Snatch', weight: result.best_snatch },
    { lift: 'Clean & Jerk', weight: result['best_c&j'] },
    { lift: 'Total', weight: result.total },
  ];
  return values.filter(
    (value): value is { lift: LiftLabel; weight: number } => !!value.weight && value.weight > 0
  );
}

export function collectRecordBreakers(
  lifter: ResolvedLifter,
  results: MeetRecord[],
  recordIndex: AdaptiveRecordIndex
): AdaptiveRecordBreaker[] {
  // One row per record slot: an athlete competing repeatedly beats the same standard many
  // times over, and only their best belongs in the output.
  const best = new Map<string, AdaptiveRecordBreaker>();

  for (const result of results) {
    const bodyweight = parseFloat(String(result['body_weight_(kg)'] ?? 0));
    if (!bodyweight) continue;
    const sportingAge = getYear(result.date) - lifter.birthYear;

    for (const ageGroup of eligibleAgeGroups(sportingAge)) {
      const matchedClass = findWeightClass(ageGroup, bodyweight, lifter.gender);
      if (!matchedClass) continue;

      for (const category of [adaptiveAllRecordsSheetName, ...lifter.categorySheetNames]) {
        const index = recordIndex[category];
        if (!index) continue;

        for (const { lift, weight } of liftsFromResult(result)) {
          const record = findRecord(index, ageGroup, lifter.gender, lift, bodyweight);
          if (!record || weight <= record.weight) continue;

          const key = `${category}_${record.ageGroupLabel}_${matchedClass.weightClass.id}_${lift}`;
          // On a tie the earlier lift stands — it got there first.
          const existing = best.get(key);
          const isBetter =
            !existing ||
            weight > existing.weight ||
            (weight === existing.weight && result.date < existing.date);
          if (!isBetter) continue;

          best.set(key, {
            category,
            weightClassName: matchedClass.weightClass.name,
            ageGroupLabel: record.ageGroupLabel,
            bodyweight,
            lift,
            weight,
            lifterName: lifter.name,
            date: result.date,
            event: result.meet ?? '',
            usawNumber: lifter.usawNumber,
            previousRecord: record.weight,
            previousHolder: record.holder,
            categoryIndex: allCategorySheetNames.indexOf(category),
            ageGroupIndex: ageGroups.indexOf(ageGroup),
            weightClassIndex: matchedClass.index,
            liftIndex: liftLabels.indexOf(lift),
          });
        }
      }
    }
  }

  return [...best.values()];
}

// An athlete the rankings never turn up is reported in an errors table below the records
// rather than dropped: a typo in the name or USAW number on the roster sheet would otherwise
// look exactly like an athlete who simply set no records, and nobody would notice.
export function generateCsv(
  recordBreakers: AdaptiveRecordBreaker[],
  unresolved: AdaptiveLifter[] = []
): string {
  const sorted = [...recordBreakers].sort((breakerA, breakerB) => {
    if (breakerA.categoryIndex !== breakerB.categoryIndex)
      return breakerA.categoryIndex - breakerB.categoryIndex;
    if (breakerA.ageGroupIndex !== breakerB.ageGroupIndex)
      return breakerA.ageGroupIndex - breakerB.ageGroupIndex;
    if (breakerA.weightClassIndex !== breakerB.weightClassIndex)
      return breakerA.weightClassIndex - breakerB.weightClassIndex;
    return breakerA.liftIndex - breakerB.liftIndex;
  });

  const rows = [
    [
      'AdaptiveCategory',
      'Weight Class',
      'Age Group',
      'Bodyweight',
      'Lift',
      'Record',
      'Lifter Name',
      'Date',
      'Event Name',
      'USAW Number',
      'Previous Record',
      'Previous Holder',
    ],
    ...sorted.map((breaker) => [
      breaker.category,
      breaker.weightClassName,
      breaker.ageGroupLabel,
      breaker.bodyweight,
      breaker.lift,
      breaker.weight,
      breaker.lifterName,
      breaker.date,
      breaker.event,
      breaker.usawNumber,
      breaker.previousRecord,
      breaker.previousHolder,
    ]),
  ];

  // A second table below the records, rather than extra columns on them: these rows describe
  // a roster problem, not a lift, and share none of the columns above. Omitted entirely when
  // every athlete resolved, so a clean run ends at the last record.
  if (unresolved.length > 0) {
    rows.push(
      [],
      ['Errors'],
      ['Lifter Name', 'USAW Number', 'Weight Class', 'Error'],
      ...unresolved.map((lifter) => [
        lifter.name,
        lifter.usawNumber,
        lifter.weightClassName,
        'Not found in the USAW rankings. Check the name and USAW number on the roster sheet.',
      ])
    );
  }

  return rows.map((row) => row.map(csvField).join(',')).join('\n') + '\n';
}

// ─── Exported entry point ─────────────────────────────────────────────────────

export async function runAdaptiveRecords(): Promise<string> {
  const roster = parseAdaptiveRoster(
    await fetchSheet(adaptiveLiftersListSheetId, adaptiveLiftersListSheetName)
  );

  const recordIndex: AdaptiveRecordIndex = {};
  for (const sheetName of allCategorySheetNames) {
    recordIndex[sheetName] = parseAdaptiveRecords(
      await fetchSheet(currentRecordsSheetId, sheetName)
    );
  }

  const recordBreakers: AdaptiveRecordBreaker[] = [];
  const unresolved: AdaptiveLifter[] = [];
  for (const lifter of roster) {
    try {
      const resolved = await resolveLifter(lifter);
      if (!resolved) {
        unresolved.push(lifter);
        continue;
      }
      const results = await fetchLifterResults(resolved.lifterId, resolved.startDate);
      if (results.length === 0) continue;
      recordBreakers.push(...collectRecordBreakers(resolved, results, recordIndex));
    } catch {
      // A request that fell over says nothing about whether the athlete exists, so it is not
      // reported as a lookup failure.
    }
  }

  return generateCsv(recordBreakers, unresolved);
}
