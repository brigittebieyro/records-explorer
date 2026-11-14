/**
 * Rows for the starter records and adaptive roster tabs, in the column layout the app reads (see
 * computeStandardsForWeightClass in src/RecordViewer/RecordViewer.tsx). Every record is a standard
 * of 0, so the first lift entered in each slot becomes the record.
 */

const {
  loadWeightClasses,
  loadYouthWeightClasses,
  loadAgeGroups,
  loadAdaptiveCategories,
  weightClassSetFor,
} = require('./appData');

const RECORD_HEADER = [
  'federation',
  'recordName',
  'ageGroup',
  'gender',
  'ageMin',
  'ageMax',
  'bodyWeightMin',
  'bodyWeightMax',
  'lift',
  'record',
  'name',
  'date',
  'place',
];
const LIFTS = ['Snatch', 'Clean & Jerk', 'Total'];
// mastersLetter starts a masters age group label: W35 for women, M35 for men.
const GENDERS = [
  { code: 'F', mastersLetter: 'W', weightClassGender: 'female' },
  { code: 'M', mastersLetter: 'M', weightClassGender: 'male' },
];
// Age groups with no upper limit carry a sentinel maximum ('1000' in ageGroups.ts); the sheets
// write it as 999.
const OPEN_ENDED_AGE = '999';

/**
 * How an age group is written in the sheet's ageGroup column. Masters groups are the gender letter
 * plus the group id (W35, M35), which normalizeSheetAgeGroup in src/Utils/Utils.ts reads back.
 */
function sheetAgeGroupLabel(ageGroup, gender) {
  if (/^\d+$/.test(ageGroup.id)) return `${gender.mastersLetter}${ageGroup.id}`;
  if (ageGroup.id === 'OPEN') return 'Open';
  return ageGroup.id;
}

function sheetAgeMax(ageGroup) {
  return Number(ageGroup.maximum_lifter_age) >= 999 ? OPEN_ENDED_AGE : ageGroup.maximum_lifter_age;
}

/** The weightClassIndicator rule from src/Utils/Utils.ts: the max, or '>' plus the min for the top class. */
function sheetBodyWeightMax(weightClass) {
  return parseFloat(weightClass.maxBodyweight) > 200
    ? `>${parseInt(weightClass.minBodyweight)}`
    : weightClass.maxBodyweight;
}

/**
 * @param {{ recordName: string, standardKey: string, appData?: object }} options appData defaults to
 *   the app's own age groups and weight classes; tests may pass their own.
 * @returns {string[][]} the header row followed by one standard per age group, gender, weight class and lift
 */
function buildRecordRows({ recordName, standardKey, appData = loadAppData() }) {
  const { ageGroups, defaultWeightClasses, youthWeightClassMap } = appData;
  const rows = [RECORD_HEADER];
  for (const ageGroup of ageGroups) {
    const weightClasses = weightClassSetFor(ageGroup, defaultWeightClasses, youthWeightClassMap);
    for (const gender of GENDERS) {
      for (const weightClass of weightClasses) {
        if (weightClass.gender !== gender.weightClassGender) continue;
        for (const lift of LIFTS) {
          rows.push([
            recordName,
            recordName,
            sheetAgeGroupLabel(ageGroup, gender),
            gender.code,
            ageGroup.minimum_lifter_age,
            sheetAgeMax(ageGroup),
            String(parseInt(weightClass.minBodyweight)),
            sheetBodyWeightMax(weightClass),
            lift,
            '0',
            standardKey,
            '',
            '',
          ]);
        }
      }
    }
  }
  return rows;
}

/**
 * The adaptive roster's header row. parseAdaptiveRoster in src/RunnableScripts/adaptiveRecords.ts
 * finds the name, USAW number and date columns by their header text, and reads the category flag
 * columns in the order of the categories in src/Data/RoutesAndSettings.ts.
 */
function buildRosterRows(categories = loadAdaptiveCategories()) {
  return [
    [
      'Lifter Name',
      'USAW Member Number',
      'Start Date',
      'End Date',
      ...categories.map((category) => category.displayName),
    ],
  ];
}

function loadAppData() {
  return {
    ageGroups: loadAgeGroups(),
    defaultWeightClasses: loadWeightClasses(),
    youthWeightClassMap: loadYouthWeightClasses(),
  };
}

module.exports = { RECORD_HEADER, LIFTS, buildRecordRows, buildRosterRows };
