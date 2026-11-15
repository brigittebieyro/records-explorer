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
  'includeClubNameOnCertificate',
  'currentRecordsSheetId',
  'currentRecordsSheetName',
  'standardKey',
  'wsoInfoUSAWUrl',
  'maintainerEmail',
  'maintainerName',
  'scriptsPassword',
];

// The same charset server/certificate/sheet.js accepts.
const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

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
    SHEET_ID_PATTERN.test(value)
      ? undefined
      : 'Please enter only the id: the part of the spreadsheet link shown here, ' +
        'https://docs.google.com/spreadsheets/d/<THIS PART>/edit',
};

/**
 * The config file's contents: the required fields, in schema order, plus
 * showAdaptiveRecordsInMenu when `trackAdaptiveRecords` is true.
 *
 * @param {object} required every key in REQUIRED_KEYS
 * @param {{ trackAdaptiveRecords?: boolean }} [options]
 */
function buildConfig(required, { trackAdaptiveRecords = false } = {}) {
  const missing = REQUIRED_KEYS.filter((key) => required[key] === undefined);
  if (missing.length > 0) throw new Error(`buildConfig is missing ${missing.join(', ')}`);

  const values = { ...required };
  if (trackAdaptiveRecords) values.showAdaptiveRecordsInMenu = true;
  return Object.fromEntries(
    CONFIG_KEY_ORDER.filter((key) => values[key] !== undefined).map((key) => [key, values[key]])
  );
}

module.exports = {
  REQUIRED_KEYS,
  parseList,
  checks,
  buildConfig,
};
