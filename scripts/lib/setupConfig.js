/**
 * Answer checks and config assembly for scripts/setup-application.js. The checks look at shape
 * only (a whole number, a YYYY-MM-DD date, a web address), the same things configSchema in
 * src/Data/RoutesAndSettings.ts checks; whether a value is right is up to the person entering it.
 */

/** configSchema order, so the written file reads in the same order as CONFIG_README.md. */
const CONFIG_KEY_ORDER = [
  'wsoId',
  'wsoOfficialName',
  'wsoRegions',
  'wsoStateNames',
  'recordTimeZone',
  'allTimeStartDate',
  'includeClubNameOnCertificate',
  'currentRecordsSheetId',
  'currentRecordsSheetName',
  'standardKey',
  'adaptiveAllRecordsSheetName',
  'adaptiveCategoryRecordsSheetNames',
  'adaptiveLiftersListSheetId',
  'adaptiveLiftersListSheetName',
  'adaptiveOptInFormUrl',
  'showAdaptiveRecordsInMenu',
  'wsoInfoUSAWUrl',
  'maintainerEmail',
  'maintainerName',
  'scriptsPassword',
];

const REQUIRED_KEYS = [
  'wsoId',
  'wsoOfficialName',
  'wsoRegions',
  'wsoStateNames',
  'recordTimeZone',
  'allTimeStartDate',
  'includeClubNameOnCertificate',
  'currentRecordsSheetId',
  'currentRecordsSheetName',
  'standardKey',
  'wsoInfoUSAWUrl',
  'maintainerEmail',
  'maintainerName',
  'scriptsPassword',
];

const ADAPTIVE_CATEGORY_KEYS = ['physical', 'hearing', 'vision', 'cognitive'];

const DEFAULT_TAB_NAMES = {
  records: 'Records',
  adaptiveAll: 'Adaptive_All',
  adaptiveCategories: {
    physical: 'Adaptive_Physical',
    hearing: 'Adaptive_Hearing',
    vision: 'Adaptive_Vision',
    cognitive: 'Adaptive_Cognitive',
  },
  adaptiveRoster: 'Adaptive_Roster',
};

// The same charset server/certificate/sheet.js accepts.
const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SHEET_URL_PATTERN = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/;

/** A spreadsheet id from either the id itself or a full spreadsheet URL; undefined when neither. */
function extractSheetId(input) {
  const text = String(input ?? '').trim();
  const fromUrl = SHEET_URL_PATTERN.exec(text);
  if (fromUrl) return fromUrl[1];
  return SHEET_ID_PATTERN.test(text) ? text : undefined;
}

/** "66, 67" -> ["66", "67"]. Blank items are dropped. */
function parseList(input) {
  return String(input ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

// Each check returns an error message, or undefined when the answer has the right shape.
const checks = {
  required: (value) => (value === '' ? 'This one is required.' : undefined),
  integer: (value) => (/^\d+$/.test(value) ? undefined : 'Please enter a whole number, like 21.'),
  list: (value) =>
    parseList(value).length > 0 ? undefined : 'Please enter at least one, separated by commas.',
  isoDate: (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Please use the form YYYY-MM-DD, like 1998-01-01.';
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
      ? undefined
      : 'That is not a real calendar date.';
  },
  webUrl: (value) =>
    /^https?:\/\/\S+$/.test(value) ? undefined : 'Please enter a web address starting with https://',
  optionalWebUrl: (value) => (value === '' ? undefined : checks.webUrl(value)),
  email: (value) =>
    /^[^\s@]+@[^\s@]+$/.test(value) ? undefined : 'Please enter an email address, like name@example.org.',
  sheetId: (value) =>
    extractSheetId(value)
      ? undefined
      : 'Please paste the spreadsheet link, or the id from it: ' +
        'https://docs.google.com/spreadsheets/d/<THIS PART>/edit',
};

/**
 * The config file's contents: the required fields, plus the adaptive fields when `adaptive` is
 * given. Fields left undefined or blank are left out.
 *
 * @param {object} required every key in REQUIRED_KEYS
 * @param {object | undefined} adaptive { allRecordsSheetName, categoryRecordsSheetNames,
 *   liftersListSheetId, liftersListSheetName, optInFormUrl }
 */
function buildConfig(required, adaptive) {
  const missing = REQUIRED_KEYS.filter((key) => required[key] === undefined);
  if (missing.length > 0) throw new Error(`buildConfig is missing ${missing.join(', ')}`);

  const values = { ...required };
  if (adaptive) {
    const categories = Object.fromEntries(
      ADAPTIVE_CATEGORY_KEYS.filter((key) => blankToUndefined(adaptive.categoryRecordsSheetNames?.[key])).map(
        (key) => [key, adaptive.categoryRecordsSheetNames[key]]
      )
    );
    Object.assign(values, {
      adaptiveAllRecordsSheetName: blankToUndefined(adaptive.allRecordsSheetName),
      adaptiveCategoryRecordsSheetNames: Object.keys(categories).length > 0 ? categories : undefined,
      adaptiveLiftersListSheetId: blankToUndefined(adaptive.liftersListSheetId),
      adaptiveLiftersListSheetName: blankToUndefined(adaptive.liftersListSheetName),
      adaptiveOptInFormUrl: blankToUndefined(adaptive.optInFormUrl),
      showAdaptiveRecordsInMenu: true,
    });
  }
  return Object.fromEntries(
    CONFIG_KEY_ORDER.filter((key) => values[key] !== undefined).map((key) => [key, values[key]])
  );
}

function blankToUndefined(value) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

module.exports = {
  REQUIRED_KEYS,
  ADAPTIVE_CATEGORY_KEYS,
  DEFAULT_TAB_NAMES,
  extractSheetId,
  parseList,
  checks,
  buildConfig,
};
