// ----------------------------------------------------------------------------------------------------------------
// WSO CONFIGURATION:
// Values a WSO sets for its own deployment are read from wsoConfig.json and re-exported here, so
// the rest of the app imports them from this file as before. Everything else in this file is the
// USAW platform and is the same for every WSO.
// ----------------------------------------------------------------------------------------------------------------
//
import wsoConfig from './wsoConfig.json';
import { assertConfigMatchesSchema, ConfigSchema } from '../Utils/SettingsUtils';

type WebUrl = `https://${string}` | `http://${string}`;

export interface WsoBoundary {
  north: number;
  south: number;
  west: number;
  east: number;
}

/**
 * The shape wsoConfig.json must have, written like a TypeScript type: a name ending in '?' is
 * optional. Checked when this module loads (see src/Utils/SettingsUtils.ts); fields the file has
 * beyond these are ignored.
 */
export const configSchema: ConfigSchema = {
  wsoId: 'integer',
  wsoOfficialName: 'string',
  'wsoDisplayName?': 'string',
  wsoRegions: 'string[]',
  wsoStateNames: 'string[]',
  recordTimeZone: 'string',
  allTimeStartDate: 'IsoDate',
  includeClubNameOnCertificate: 'boolean',
  certificateWebsiteText: 'string',
  currentRecordsSheetId: 'string',
  currentRecordsSheetName: 'string',
  priorRecordsSheetNames: 'string[]',
  standardKey: 'string',
  'adaptiveAllRecordsSheetName?': 'string',
  'adaptiveCategoryRecordsSheetNames?': {
    'physical?': 'string',
    'hearing?': 'string',
    'vision?': 'string',
    'cognitive?': 'string',
  },
  'adaptiveLiftersListSheetId?': 'string',
  'adaptiveLiftersListSheetName?': 'string',
  'adaptiveOptInFormUrl?': 'WebUrl',
  'showAdaptiveRecordsInMenu?': 'boolean',
  localScheduleUrl: 'WebUrl',
  localHomeUrl: 'WebUrl',
  wsoInfoUSAWUrl: 'WebUrl',
  maintainerEmail: 'string',
  maintainerName: 'string',
  'wsoBoundary?': { north: 'number', south: 'number', west: 'number', east: 'number' },
  ineligibleAthletes: 'string[]',
  scriptsPassword: 'string',
};
assertConfigMatchesSchema(wsoConfig, configSchema, 'wsoConfig.json');

export const wsoId: number = wsoConfig.wsoId;
/** The WSO's name exactly as Sport80 reports it. Compared against the wso field of rankings rows.
 * Used in place of display name when not provided. */
export const wsoOfficialName: string = wsoConfig.wsoOfficialName;
/**
 * The WSO's name as shown on the site and on certificates: wsoDisplayName when the config has one,
 * otherwise wsoOfficialName. Read through a wider type: the JSON import's inferred type has no
 * field the file leaves out.
 */
export const wsoDisplayName: string =
  (wsoConfig as { wsoDisplayName?: string }).wsoDisplayName ?? wsoOfficialName;
/** Sport80 region ids searched for local meets, one request per region. */
export const wsoRegions: string[] = wsoConfig.wsoRegions;
/**
 * The state names as they appear in Sport80 meet addresses, e.g. "123 Main St, Sacramento,
 * California, 95814". Used to show each local meet's city.
 */
export const wsoStateNames: string[] = wsoConfig.wsoStateNames;
/**
 * The time zone every record date is read and written in. Fixed by the WSO rather than taken from
 * the viewer's machine: a record was set on one particular day, and that day must not change with
 * who is looking at it.
 *
 * Sent with every certificate request. The server keeps no copy.
 */
export const recordTimeZone: string = wsoConfig.recordTimeZone;
/**
 * Whether a certificate printed from a records sheet prints the record's club, when the row has one.
 * Sent with every certificate request; a tab without a clubName column prints no club either way.
 */
export const includeClubNameOnCertificate: boolean = wsoConfig.includeClubNameOnCertificate;
/** Printed in the corner of every certificate. An empty string prints nothing there. */
export const certificateWebsiteText: string = wsoConfig.certificateWebsiteText;
/** The large title across the top of every certificate. */
export const certificateTitle: string = `${wsoDisplayName} WSO`;

// Use a relative local base path so the client works when deployed behind a reverse proxy.
const _baseUrl = '/api/lifter-data'; // instead of https://admin-usaw-rankings.sport80.com/

// The rankings endpoint returns nothing unless a weight_class filter is supplied — there is
// no wildcard — so `search` only ever narrows a single-class query, never replaces it.
export const getRankingsRoute = (count?: number, search?: string): string => {
  const limit = typeof count === 'number' && count > 0 ? count : 3;
  const searchTerm = search ? encodeURIComponent(search) : '';
  return `${_baseUrl}/categories/all/rankings/table/data?platform=1&p=0&l=${limit}&sort=action&d=asc&s=${searchTerm}&st=`;
};

export const usawRankingsPublicSiteLink =
  'https://usaweightlifting.sport80.com/public/rankings/all';

export const getLifterId = (lifterActionRoute: Array<{ url: string }>): string => {
  return lifterActionRoute[0].url.split(
    'https://usaweightlifting.sport80.com/public/rankings/member/'
  )[1];
};

export const getLifterDataRoute = (publicLifterId: string): string => {
  const pageParams = `?p=0&l=100&sort=&d=asc&s=&st=`;
  return `${_baseUrl}/athletes/${publicLifterId}/table/data${pageParams}`;
};

export const getIndividualMeetResultsRoute = (eventId: string, count?: number): string => {
  const limit = typeof count === 'number' && count > 0 ? count : 50;
  return `/api/meet-results/${eventId}/table/data?p=0&l=${limit}&sort=&d=asc&s=&st=`;
  // This route's data object contains an array of MeetResult objects.
};

export const getLocalMeetByNameRoute = (meetName: string): string => {
  return `/api/meet-search?platform=1&p=0&l=30&sort=&d=asc&s=${encodeURIComponent(meetName)}&st=`;
  // This will return an array of objects for each meet whose name contains the search term.
  // {
  //   "action": [{
  // "type": string,
  // "url": "https://usaweightlifting.sport80.com/public/rankings/results/[RESULTS ID HERE]" }],
  //   "date": string,
  //   "level": "Local",
  //   "meet": string,
  //   "results": number
  // }
  // It should always be used as a POST with the following request payload:
  // {
  //   "columns": [],
  //   "filters": {
  //       "date_range_start": {meet date here},
  //       "date_range_end": {meet date here},
  //       "level": 1 // 1 for local, which is all we care about
  //   }
};

// Searches by state
export const getMeetsRoute = (count?: number): string => {
  const limit = typeof count === 'number' && count > 0 ? count : 30;
  return `/api/local-meets/data/new/1?p=0&i=${limit}&s=&l=&d=10&f=`;
  //https://usaweightlifting.sport80.com/api/public/widget/data/new/1?p=0&i=20&s=&l=&d=10&f=
};

export const headers: Record<string, string> = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'x-api-token':
    (window as any).__ENV__?.REACT_APP_SPORT80_API_TOKEN ??
    process.env.REACT_APP_SPORT80_API_TOKEN ??
    '',
  'Access-Control-Allow-Origin': '*',
};
/**
 * The calendar day `when` falls on in recordTimeZone, as YYYY-MM-DD. toISOString() would give the
 * UTC day instead, which rolls over in the afternoon or evening across the US. en-CA formats as
 * YYYY-MM-DD.
 */
export const toRecordDate = (when: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: recordTimeZone }).format(when);

// Calendar arithmetic on a YYYY-MM-DD day, done in UTC so no time zone or DST shift can move it.
// Month arithmetic rolls over on short months (May 31 less three months is Mar 3).
const _shiftIsoDate = (isoDate: string, { days = 0, months = 0 }): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().split('T')[0];
};

// The current weight classes took effect August 1, 2026 (see defaultWeightClasses.ts), and
// each class supplies its own start date. Queries run through tomorrow so that meets logged
// today are always inside the range.
export const endDate = _shiftIsoDate(toRecordDate(), { days: 1 });
/** How far back the all-time record search reaches, set per WSO. */
export const allTimeStartDate: string = wsoConfig.allTimeStartDate;
export const youthAllTimeStartDate = '2014-01-01'; // This is a magic number - looking for a date which captures history, without the source API throwing errors.
// Older meets don't all have logitude and latitude, so we can't filter them all.
export const localMeetStartDate = '2026-01-01';

// Must be manually updated each year.
export const nationalsData = '2027-03-07'; // Mar 7, 2027
export const nationalsQualifyingStartDate = '2026-02-04'; //February 4, 2026 – February 4, 2027
export const nationalsQualifyingEndDate = '2027-02-04';

// Until Nationals happens, rank on the official qualifying window. Once it's past, that window is
// stale until next year's dates are entered, so fall back to a rolling 16 months.
export const getNationalsDateRange = (
  today: Date = new Date()
): { startDate: string; endDate: string } => {
  if (toRecordDate(today) <= nationalsData) {
    return { startDate: nationalsQualifyingStartDate, endDate: nationalsQualifyingEndDate };
  }
  return getRecentMonthsDateRange(16, today);
};

/**
 * A rolling window of the last `monthCount` months, ending tomorrow so that a meet logged today is
 * always inside it -- the rule module-level `endDate` follows. Days are taken in recordTimeZone.
 *
 * `today` is injectable because `endDate` is fixed at module load and so cannot be pinned in a test.
 * Month arithmetic rolls over on short months (May 31 less three months is Mar 3), which widens the
 * window by a couple of days rather than narrowing it.
 */
export const getRecentMonthsDateRange = (
  monthCount: number,
  today: Date = new Date()
): { startDate: string; endDate: string } => {
  const recordToday = toRecordDate(today);
  return {
    startDate: _shiftIsoDate(recordToday, { months: -monthCount }),
    endDate: _shiftIsoDate(recordToday, { days: 1 }),
  };
};
// ----------------------------------------------------------------------------------------------------------------
// Google Sheets Routes for Prior Recognized Records
// ----------------------------------------------------------------------------------------------------------------
//
const _sheetsBaseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
const _googleKey =
  (window as any).__ENV__?.REACT_APP_GOOGLE_API_KEY ?? process.env.REACT_APP_GOOGLE_API_KEY ?? '';
export const getSheetRoute = (sheetId: string, sheetName: string): string => {
  return `${_sheetsBaseUrl}/${sheetId}/values/${sheetName}?key=${_googleKey}`;
};

// Debug overrides for current records. These are norcals' test and real sheets
// You can add or swap in your own.
//   1EJgLNWI4v5KZo780RIZ6zSsaDnOinuhJHQOvZoDL8BM -- test sheet.
//   1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ -- production data! Link is public! DO NOT alter data for testing.
export const currentRecordsSheetId: string = wsoConfig.currentRecordsSheetId;
export const currentRecordsSheetName: string = wsoConfig.currentRecordsSheetName;
/** History tabs in the same spreadsheet, newest first. */
export const priorRecordsSheetNames: string[] = wsoConfig.priorRecordsSheetNames;
// ----------------------------------------------------------------------------------------------------------------
// Adaptive records settings, all optional. Read through a wider type: the JSON import's inferred type has
// no field the file leaves out, and requires every field the file has.
// ----------------------------------------------------------------------------------------------------------------
//
type AdaptiveCategoryKey = 'physical' | 'hearing' | 'vision' | 'cognitive';
interface AdaptiveConfig {
  adaptiveAllRecordsSheetName?: string;
  adaptiveCategoryRecordsSheetNames?: Partial<Record<AdaptiveCategoryKey, string>>;
  adaptiveLiftersListSheetId?: string;
  adaptiveLiftersListSheetName?: string;
  adaptiveOptInFormUrl?: string;
  showAdaptiveRecordsInMenu?: boolean;
}
const _adaptiveConfig = wsoConfig as AdaptiveConfig;
/** The value, or undefined when the config leaves it out or blank. */
const _configured = (value: string | undefined): string | undefined =>
  value !== undefined && value.trim() !== '' ? value : undefined;

/**
 * The tab in the current records spreadsheet holding the combined adaptive records, or undefined
 * when the WSO has none.
 */
export const adaptiveAllRecordsSheetName: string | undefined = _configured(
  _adaptiveConfig.adaptiveAllRecordsSheetName
);
// The lifter column holds this sentinel when the WSO has set a record standard nobody has
// reached yet. It is sheet data, so it must match the sheet exactly.
export const standardKey: string = wsoConfig.standardKey;
export const publicSpreadsheetLink = `https://docs.google.com/spreadsheets/d/${currentRecordsSheetId}`;
/** The adaptive athlete roster's spreadsheet and tab, or undefined when the WSO has none. */
export const adaptiveLiftersListSheetId: string | undefined = _configured(
  _adaptiveConfig.adaptiveLiftersListSheetId
);
export const adaptiveLiftersListSheetName: string | undefined = _configured(
  _adaptiveConfig.adaptiveLiftersListSheetName
);
/** Linked from the Adaptive Records page when set. */
export const adaptiveOptInFormUrl: WebUrl | undefined = _configured(
  _adaptiveConfig.adaptiveOptInFormUrl
) as WebUrl | undefined;

// ----------------------------------------------------------------------------------------------------------------
// Adaptive Category Names
// ----------------------------------------------------------------------------------------------------------------
// `displayName` is the on-screen wording; `certificateDisplayKey` is how the category reads
// mid-sentence on a printed certificate, where the longer screen wording is a mouthful.
// Both are sent to the server as part of the composed certificate wording; the server keeps no copy.
// `id` is the category's records tab, named in wsoConfig.json. A category whose tab the config
// leaves out is not listed. The array order is the order of the category flag columns in the
// adaptive roster sheet.
export interface AdaptiveCategory {
  id: string;
  displayName: string;
  certificateDisplayKey: string;
}
const _adaptiveCategoryWording: Array<{ key: AdaptiveCategoryKey } & Omit<AdaptiveCategory, 'id'>> =
  [
    {
      key: 'physical',
      displayName: 'Physical Disability',
      certificateDisplayKey: 'Adaptive (Physical Disability)',
    },
    {
      key: 'hearing',
      displayName: 'Deaf, Deafened, or Hard of Hearing',
      certificateDisplayKey: 'Adaptive (Deaf and Hard of Hearing)',
    },
    {
      key: 'vision',
      displayName: 'Visual Impairment',
      certificateDisplayKey: 'Adaptive (Visual Impairment)',
    },
    {
      key: 'cognitive',
      displayName: 'Intellectual Impairment',
      certificateDisplayKey: 'Adaptive (Intellectual Impairment)',
    },
  ];
const _categorySheetNames = _adaptiveConfig.adaptiveCategoryRecordsSheetNames ?? {};
export const adaptiveCategories: AdaptiveCategory[] = _adaptiveCategoryWording.flatMap(
  ({ key, ...wording }) => {
    const id = _configured(_categorySheetNames[key]);
    return id ? [{ id, ...wording }] : [];
  }
);
/** The configured category records tabs, in the order of adaptiveCategories. */
export const adptiveCategoryRecordsSheetNames: string[] = adaptiveCategories.map(
  (category) => category.id
);

/** Whether the header menu links to the Adaptive WSO Records page. False when the config leaves it out. */
export const showAdaptiveRecordsInMenu: boolean =
  _adaptiveConfig.showAdaptiveRecordsInMenu ?? false;
/**
 * The adaptive settings, by config name, that are left out or blank, in this order. Listed on the
 * Adaptive Records page below its summary.
 */
export const missingAdaptiveConfigs: string[] = Object.entries({
  adaptiveAllRecordsSheetName,
  adaptiveLiftersListSheetName,
  adaptiveLiftersListSheetId,
  adaptiveOptInFormUrl,
})
  .filter(([, value]) => value === undefined)
  .map(([name]) => name);
/**
 * Whether the Scripts page offers the adaptive records script. It needs the roster sheet and at
 * least one adaptive records tab to compare against.
 */
export const adaptiveRecordsScriptAvailable: boolean =
  adaptiveLiftersListSheetId !== undefined &&
  adaptiveLiftersListSheetName !== undefined &&
  (adaptiveAllRecordsSheetName !== undefined || adaptiveCategories.length > 0);

// The combined Adaptive_All tab is not one of the four categories, so it has no entry above
// to draw from and needs its own certificate wording.
export const adaptiveAllCertificateDisplayKey = 'Adaptive (Overall)';

// ----------------------------------------------------------------------------------------------------------------
// External Links
// ----------------------------------------------------------------------------------------------------------------
//
export const localScheduleUrl: WebUrl = wsoConfig.localScheduleUrl as WebUrl;
export const localHomeUrl: WebUrl = wsoConfig.localHomeUrl as WebUrl;
export const americanRecordsUrl: WebUrl = 'https://www.usaweightlifting.org/american-records';
export const wsoInfoUSAWUrl: WebUrl = wsoConfig.wsoInfoUSAWUrl as WebUrl;
export const githubUrl: WebUrl = 'https://github.com/brigittebieyro/records-explorer';
export const maintainerEmail: string = wsoConfig.maintainerEmail;
export const maintainerName: string = wsoConfig.maintainerName;

// ----------------------------------------------------------------------------------------------------------------
// WSO Geographic Boundary
// An optional lat/lng box; local meets outside it are not listed. When it is absent, every local meet in
// wsoRegions is listed. California North Central's south edge is the southern edge of Kern County
// (includes Bakersfield), per OpenStreetMap Nominatim.
// ----------------------------------------------------------------------------------------------------------------
//
// Read through a wider type: the JSON import's inferred type requires the field whenever the file has it.
export const wsoBoundary: WsoBoundary | undefined = (wsoConfig as { wsoBoundary?: WsoBoundary })
  .wsoBoundary;

// ----------------------------------------------------------------------------------------------------------------
// Exceptions who may not hold records, e.g. because they do not live within the WSO.
// ----------------------------------------------------------------------------------------------------------------
//
export const ineligibleAthletes: string[] = wsoConfig.ineligibleAthletes;

// ----------------------------------------------------------------------------------------------------------------
// Scripts page password: the SHA-256 hex digest of `${password}---${wsoDisplayName}` (see hashPassword
// in src/Utils/Utils.ts), not the password itself. Changing the display name changes the digest.
// ----------------------------------------------------------------------------------------------------------------
//
export const scriptsPassword: string = wsoConfig.scriptsPassword;

// ----------------------------------------------------------------------------------------------------------------
// Plausibility caps — results with any value above these are considered data errors and are not displayed.
// ----------------------------------------------------------------------------------------------------------------
//
export const maxSnatch = 200;
export const maxCleanAndJerk = 280;
export const maxTotal = 470;
