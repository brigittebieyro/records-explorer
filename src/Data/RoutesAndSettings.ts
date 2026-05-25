// ----------------------------------------------------------------------------------------------------------------
// BARS DATA & ROUTES:
// ----------------------------------------------------------------------------------------------------------------
//
export const wsoId = 21;
export const wsoName = 'California North Central';
//
// Use a relative local base path so the client works when deployed behind a reverse proxy.
const _baseUrl = '/api/lifter-data'; // instead of https://admin-usaw-rankings.sport80.com/ !
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
// Exceptions who may not hold records, because they do not live within the WSO.
// ----------------------------------------------------------------------------------------------------------------
//
export const ineligibleAthletes: string[] = ['Aurora van Ulft', 'Bekdoolot Rasulbekov'];
