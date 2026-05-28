// ----------------------------------------------------------------------------------------------------------------
// BARS DATA & ROUTES:
// ----------------------------------------------------------------------------------------------------------------
//
export const wsoId = 21;
export const wsoName = 'California North Central';
export const wsoRegion = '66'; // This will be used to search for california by state.
//
// Use a relative local base path so the client works when deployed behind a reverse proxy.
const _baseUrl = '/api/lifter-data'; // instead of https://admin-usaw-rankings.sport80.com/

export const getRankingsRoute = (count?: number): string => {
  const limit = typeof count === 'number' && count > 0 ? count : 3;
  return `${_baseUrl}/categories/all/rankings/table/data?platform=1&p=0&l=${limit}&sort=action&d=asc&s=&st=`;
};

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
// New weight classes begin August 1, 2026
export const endDate = '2026-08-01';
// New york WSO starts tracking records in 1998, no reason we can't do the same.
export const allTimeStartDate = '1998-01-01';
export const youthAllTimeStartDate = '2014-01-01'; // This is a magic number - looking for a date which captures history, without the source API throwing errors.
// Older meets don't all have logitude and latitude, so we can't filter them all.
export const localMeetStartDate = '2026-01-01';

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
export const currentRecordsSheetId = '1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ';
export const currentRecordsSheetName = 'Raw_Data';

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
export const ineligibleAthletes: string[] = ['Aurora van Ulft', 'Bekdoolot Rasulbekov'];

// ----------------------------------------------------------------------------------------------------------------
// Scripts page password
// ----------------------------------------------------------------------------------------------------------------
//
export const scriptsPassword = 'pineapple';

// ----------------------------------------------------------------------------------------------------------------
// Plausibility caps — results with any value above these are considered data errors and are not displayed.
// ----------------------------------------------------------------------------------------------------------------
//
export const maxSnatch = 200;
export const maxCleanAndJerk = 280;
export const maxTotal = 470;
