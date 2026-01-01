// ----------------------------------------------------------------------------------------------------------------
// BARS DATA & ROUTES:
// ----------------------------------------------------------------------------------------------------------------
//
export const wsoId = 21;
export const wsoName = "California North Central";
//
// Run npm install -g local-cors-proxy and lcp --proxyUrl https://admin-usaw-rankings.sport80.com to make this work
// Will not be needed when hosted in real life.

// const _baseUrl = "http://localhost:8010/proxy/"; // instead of https://admin-usaw-rankings.sport80.com/ !
// const _baseUrl = "https://admin-usaw-rankings.sport80.com/";
const _baseUrl = "/"
export const getRankingsRoute = (count) => {
  // fetch(_proxyUrl)
  //     .then(response => response.json())
  //     .then(response => {
  //       debugger;
  //       return response
  //     });
  const limit = typeof count === "number" && count > 0 ? count : 3;
  return `${_baseUrl}api/categories/all/rankings/table/data?platform=1&p=0&l=${limit}&sort=action&d=asc&s=&st=`;
};

export const getLifterId = (lifterActionRoute) => {
  return lifterActionRoute[0].url.split(
    "https://usaweightlifting.sport80.com/public/rankings/member/",
  )[1];
};
export const getLifterDataRoute = (publicLifterId) => {
  const pageParams = `?p=0&l=100&sort=&d=asc&s=&st=`;
  // https://admin-usaw-rankings.sport80.com/api/athletes/29927/table/data?p=1&l=30&sort=&d=asc&s=&st=
  return `${_baseUrl}api/athletes/${publicLifterId}/table/data${pageParams}`;
};
export const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  "x-api-token": "14ced0f3-421f-4acf-94ad-cc63a371af19",
  "Access-Control-Allow-Origin": "*",
};
// New weight classes begin August 1, 2026
export const endDate = "2026-08-01";
// New york WSO starts tracking records in 1998, no reason we can't do the same.
export const allTimeStartDate = "1998-01-01";

// ----------------------------------------------------------------------------------------------------------------
// Google Sheets Routes for Prior Recognized Records
// ----------------------------------------------------------------------------------------------------------------
//
const _sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const _googleKey = "AIzaSyB3tiu4QqJb-brY0MzE-e6J6rac-Lcn2_A";
export const getSheetRoute = (sheetId, sheetName) => {
  return `${_sheetsBaseUrl}/${sheetId}/values/${sheetName}?key=${_googleKey}`;
};
// for current records:
export const currentRecordsSheetId =
  "1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ";
export const currentRecordsSheetName = "Norcal";
