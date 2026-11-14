// Finds one record in the raw rows of a records sheet tab.
//
// Mirrors the keying in computeStandardsForWeightClass (src/RecordViewer/RecordViewer.tsx), so
// the certificate can never print something different from what the page displays.

// Sheet columns, shared by every records tab. The adaptive tabs stop at 12; the home page's
// Post-Aug2026 carries two extra year columns after that.
const COL = {
  ageGroup: 2,
  gender: 3,
  ageMin: 4,
  weightClass: 7,
  lift: 8,
  weight: 9,
  lifter: 10,
  date: 11,
  event: 12,
};

// The clubName column sits at a different index on different tabs, and older tabs have none, so it
// is located by its header rather than by position.
const CLUB_NAME_HEADER = 'clubname';

/** @returns {number} the clubName column's index in the header row, or -1 when there is none */
function findClubNameColumn(rows) {
  const header = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : [];
  return header.findIndex((cell) => String(cell ?? '').trim().toLowerCase() === CLUB_NAME_HEADER);
}

/**
 * @param {string[][]} rows raw `values` from the Sheets API, header row included
 * @param {{ageGroup: string, gender: string, weightClass: string, lift: string}} query
 *   gender is 'male' | 'female'; weightClass is the sheet indicator ('53', '>86')
 * @returns {{weight, lifter, date, event, clubName, ageGroupId, gender, weightClass, lift}|null}
 *   clubName is null when the tab has no clubName column or the row leaves it empty
 */
function findRecord(rows, { ageGroup, gender, weightClass, lift }) {
  if (!Array.isArray(rows)) return null;

  const wantAge = String(ageGroup).toUpperCase();
  const wantGender = gender === 'female' ? 'F' : 'M';
  const wantClass = String(weightClass).trim();
  const wantLift = String(lift).trim();

  let match = null;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length <= COL.lifter) continue;
    if (String(row[COL.weightClass]).trim() !== wantClass) continue;
    if (String(row[COL.gender]).toUpperCase() !== wantGender) continue;
    if (String(row[COL.lift]).trim() !== wantLift) continue;

    // Masters rows are keyed 'W35'/'M35' in the age group column, but the site keys them by the
    // bare age (column 4, ageMin) so they line up with the ids in ageGroups.ts. Youth and Open
    // rows use the age group column as-is.
    const ageKey = String(row[COL.ageGroup]).toUpperCase();
    const indicator = ageKey[0];
    const recordKey =
      indicator === 'W' || indicator === 'M' ? String(row[COL.ageMin]).trim() : ageKey;
    if (recordKey.toUpperCase() !== wantAge) continue;

    // Keep the LAST match, not the first: the client builds a map with records[lift] = {...} in
    // a forEach, so a later duplicate row overwrites an earlier one. A find() would return the
    // first and print a different record than the page shows.
    //
    // STANDARD rows are deliberately NOT rejected here. Hiding the print link for a placeholder
    // is a UI decision; the server renders whatever row it is pointed at.
    match = row;
  }

  if (!match) return null;

  // The adaptive tabs trim trailing empty cells, so a row with no meet can come back 11 wide and
  // these are undefined rather than ''. Normalise to null so the renderer can simply skip them.
  const clubColumn = findClubNameColumn(rows);
  const optional = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v));

  return {
    weight: String(match[COL.weight]),
    lifter: String(match[COL.lifter]),
    date: optional(match[COL.date]),
    event: optional(match[COL.event]),
    clubName: clubColumn >= 0 ? optional(match[clubColumn]) : null,
    ageGroupId: wantAge,
    gender: wantGender,
    weightClass: wantClass,
    lift: wantLift,
  };
}

module.exports = { findRecord, findClubNameColumn, COL };
