// ----------------------------------------------------------------------------------------------------------------
// BARS DATA & ROUTES:
// ----------------------------------------------------------------------------------------------------------------
//
export const wsoId = 21;
export const wsoName = 'California North Central';
/**
 * The time zone every record date is read and written in. Hard-coded rather than taken from the
 * viewer's machine: a record was set on one particular day, and that day must not change with who
 * is looking at it.
 *
 * Sent with every certificate request. The server keeps no copy -- this file is the single source
 * of truth, the same way it is for the sheet ids and the class wording.
 */
export const recordTimeZone = 'America/Los_Angeles';
export const wsoRegion = '66'; // This will be used to search for california by state.
//
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
// The current weight classes took effect August 1, 2026 (see defaultWeightClasses.ts), and
// each class supplies its own start date. Queries run through tomorrow so that meets logged
// today are always inside the range.
const _tomorrow = new Date();
_tomorrow.setDate(_tomorrow.getDate() + 1);
export const endDate = _tomorrow.toISOString().split('T')[0];
// New york WSO starts tracking records in 1998, no reason we can't do the same.
export const allTimeStartDate = '1998-01-01';
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
  if (today.toISOString().split('T')[0] <= nationalsData) {
    return { startDate: nationalsQualifyingStartDate, endDate: nationalsQualifyingEndDate };
  }
  const lookback = new Date(today);
  lookback.setMonth(lookback.getMonth() - 16);
  return { startDate: lookback.toISOString().split('T')[0], endDate };
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
// for current records:
// export const currentRecordsSheetId = '1EJgLNWI4v5KZo780RIZ6zSsaDnOinuhJHQOvZoDL8BM'; // Test sheet.
export const currentRecordsSheetId = '1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ'; // Records sheet id. Production data! Link is public! DO NOT alter data for testing.
export const currentRecordsSheetName = 'Post-Aug2026';
export const priorRecordsSheetNames = ['Pre-Aug2026', 'Pre-June2025', 'Pre-2018']; // Raw_Data is pre-Aug2026. There is a display sheet which references it, and we are not ready to rename.
export const adaptiveAllRecordsSheetName = 'Adaptive_All';
// The lifter column holds this sentinel when the WSO has set a record standard nobody has
// reached yet. It is sheet data, so it must match the sheet exactly.
export const standardKey = 'STANDARD';
export const adptiveCategoryRecordsSheetNames = [
  'Adaptive_Physical',
  'Adaptive_Hearing',
  'Adaptive_Vision',
  'Adaptive_Cognitive',
];
export const publicSpreadsheetLink =
  'https://docs.google.com/spreadsheets/d/1EJgLNWI4v5KZo780RIZ6zSsaDnOinuhJHQOvZoDL8BM';
export const adaptiveLiftersListSheetId = '1hO6VHntKEujjtx8P0kIMJQ_vM46INg2D_jHei_HZUW0';
export const adaptiveLiftersListSheetName = 'IDsAndCategories';
export const adaptiveOptInFormUrl = 'https://forms.gle/2Y7qKS7C2pa3d4jLA';

// ----------------------------------------------------------------------------------------------------------------
// Adaptive Category Names
// ----------------------------------------------------------------------------------------------------------------
// `displayName` is the on-screen wording; `certificateDisplayKey` is how the category reads
// mid-sentence on a printed certificate, where the longer screen wording is a mouthful.
// Mirrored into server/certificate/labels.js, with a drift test pinning the two together.
export const adaptiveCategories = [
  {
    id: 'Adaptive_Physical',
    displayName: 'Physical Disability',
    certificateDisplayKey: 'Adaptive (Physical Disability)',
  },
  {
    id: 'Adaptive_Hearing',
    displayName: 'Deaf, Deafened, or Hard of Hearing',
    certificateDisplayKey: 'Adaptive (Deaf and Hard of Hearing)',
  },
  {
    id: 'Adaptive_Vision',
    displayName: 'Visual Impairment',
    certificateDisplayKey: 'Adaptive (Visual Impairment)',
  },
  {
    id: 'Adaptive_Cognitive',
    displayName: 'Intellectual Impairment',
    certificateDisplayKey: 'Adaptive (Intellectual Impairment)',
  },
];

// The combined Adaptive_All tab is not one of the four categories, so it has no entry above
// to draw from and needs its own certificate wording.
export const adaptiveAllCertificateDisplayKey = 'Adaptive (Overall)';

// ----------------------------------------------------------------------------------------------------------------
// External Links
// ----------------------------------------------------------------------------------------------------------------
//
type WebUrl = `https://${string}` | `http://${string}`;
export const localScheduleUrl: WebUrl = 'https://canorthcentralwso.org/meet-schedule';
export const localHomeUrl: WebUrl = 'https://canorthcentralwso.org';
export const americanRecordsUrl: WebUrl = 'https://www.usaweightlifting.org/american-records';
export const wsoInfoUSAWUrl: WebUrl =
  'https://www.usaweightlifting.org/club-wso/wso-information/california-north-central';
export const githubUrl: WebUrl = 'https://github.com/brigittebieyro/records-explorer';
export const maintainerEmail: string = 'brigitte.bieyro@gmail.com';
export const maintainerName: string = 'Brigitte Bieyro';

// ----------------------------------------------------------------------------------------------------------------
// WSO Geographic Boundary (California North Central)
// South boundary is the southern edge of Kern County (includes Bakersfield).
// Source: OpenStreetMap Nominatim, California South WSO ("Bakersfield to San Ysidro").
// ----------------------------------------------------------------------------------------------------------------
//
export const wsoBoundary = {
  north: 42.01, // California–Oregon border
  south: 34.79, // Southern edge of Kern County
  west: -124.41, // California Pacific coastline
  east: -114.13, // California–Nevada/Arizona border
};

// ----------------------------------------------------------------------------------------------------------------
// Exceptions who may not hold records, because they do not live within the WSO.
// ----------------------------------------------------------------------------------------------------------------
//
export const ineligibleAthletes: string[] = [
  'Imaginary B. Athlete',
  // 'Aurora van Ulft', 'Bekdoolot Rasulbekov'
];

// ----------------------------------------------------------------------------------------------------------------
// Scripts page password
// ----------------------------------------------------------------------------------------------------------------
//
export const scriptsPassword = 'ea08af88f45b2031464da9a3f5ffcfb993dff502fc1b945beee186764a21a89d';

// ----------------------------------------------------------------------------------------------------------------
// Plausibility caps — results with any value above these are considered data errors and are not displayed.
// ----------------------------------------------------------------------------------------------------------------
//
export const maxSnatch = 200;
export const maxCleanAndJerk = 280;
export const maxTotal = 470;
