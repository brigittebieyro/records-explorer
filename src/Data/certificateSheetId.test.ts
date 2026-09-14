import { currentRecordsSheetId } from './RoutesAndSettings';

// The certificate's display wording is composed by the client and passed to the server, so there
// is no label duplication left to guard. The spreadsheet id is the one value the server still
// holds its own copy of, deliberately: letting the client name the spreadsheet would let any
// caller point the server at an arbitrary Google Sheet.
//
// It is swapped to the test sheet during development, and both sides must move together or the
// page and its certificates read from different spreadsheets.
/* eslint-disable @typescript-eslint/no-var-requires */
const { SHEET_ID } = require('../../server/certificate/sheet.js');

test('the server certificate sheet id matches currentRecordsSheetId', () => {
  expect(SHEET_ID).toBe(currentRecordsSheetId);
});
