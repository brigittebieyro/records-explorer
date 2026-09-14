const test = require('node:test');
const assert = require('node:assert');
const { findRecord } = require('./lookup');

// Real column layout, verified against the live sheet:
// 0 federation, 1 recordName, 2 ageGroup, 3 gender, 4 ageMin, 5 ageMax, 6 bodyWeightMin,
// 7 bodyWeightMax, 8 lift, 9 record, 10 name, 11 date, 12 place
const HEADER = [
  'federation', 'recordName', 'ageGroup', 'gender', 'ageMin', 'ageMax', 'bodyWeightMin',
  'bodyWeightMax', 'lift', 'record', 'name', 'date', 'place',
];

const row = ({
  ageGroup = 'Open', gender = 'F', ageMin = '0', weightClass = '53', lift = 'Snatch',
  weight = '76', lifter = 'Jade Morales', date = '2026-06-23', event = 'San Francisco Open',
} = {}) => [
  'Norcal', 'California North Central', ageGroup, gender, ageMin, '999', '49',
  weightClass, lift, weight, lifter, date, event,
];

test('finds an Open record and returns the printed fields', () => {
  const got = findRecord([HEADER, row()], {
    ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch',
  });
  assert.deepStrictEqual(got, {
    weight: '76', lifter: 'Jade Morales', date: '2026-06-23', event: 'San Francisco Open',
    ageGroupId: 'OPEN', gender: 'F', weightClass: '53', lift: 'Snatch',
  });
});

test('the header row never matches a query', () => {
  // Row 0 is always present in the API response. It is harmless only because column 7 holds
  // 'bodyWeightMax', which is not a class indicator -- pin that so nobody "optimises" the match.
  const got = findRecord([HEADER], {
    ageGroup: 'OPEN', gender: 'female', weightClass: 'bodyWeightMax', lift: 'lift',
  });
  assert.strictEqual(got, null);
});

test('masters rows are keyed by ageMin, not the W35/M35 age group cell', () => {
  const rows = [HEADER, row({ ageGroup: 'W35', ageMin: '35', lifter: 'Masters Lifter' })];
  assert.strictEqual(
    findRecord(rows, { ageGroup: '35', gender: 'female', weightClass: '53', lift: 'Snatch' }).lifter,
    'Masters Lifter'
  );
  // 'W35' is the sheet's spelling, not an age group id, so it must not resolve.
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'W35', gender: 'female', weightClass: '53', lift: 'Snatch' }),
    null
  );
});

test('youth age groups sharing a weight class indicator are disambiguated by age group', () => {
  // U11 and U13 genuinely collide on class indicators, which is why the age group is part of
  // the key (see the comment at RecordViewer.tsx:153-155).
  const rows = [
    HEADER,
    row({ ageGroup: 'U11', weightClass: '30', weight: '20', lifter: 'Younger' }),
    row({ ageGroup: 'U13', weightClass: '30', weight: '35', lifter: 'Older' }),
  ];
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'U11', gender: 'female', weightClass: '30', lift: 'Snatch' }).lifter,
    'Younger'
  );
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'U13', gender: 'female', weightClass: '30', lift: 'Snatch' }).lifter,
    'Older'
  );
});

test('open-ended classes match on the > indicator', () => {
  const rows = [HEADER, row({ weightClass: '>86', lifter: 'Heavyweight' })];
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'OPEN', gender: 'female', weightClass: '>86', lift: 'Snatch' }).lifter,
    'Heavyweight'
  );
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'OPEN', gender: 'female', weightClass: '86', lift: 'Snatch' }),
    null
  );
});

test('gender filters rows', () => {
  const rows = [
    HEADER,
    row({ gender: 'F', lifter: 'She' }),
    row({ gender: 'M', lifter: 'He' }),
  ];
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch' }).lifter,
    'She'
  );
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'OPEN', gender: 'male', weightClass: '53', lift: 'Snatch' }).lifter,
    'He'
  );
});

test('duplicate rows resolve last-wins, matching the client map build', () => {
  // No live sheet currently has duplicates; this pins the behaviour so it cannot drift from
  // computeStandardsForWeightClass, which overwrites on each forEach pass.
  const rows = [HEADER, row({ lifter: 'First', weight: '70' }), row({ lifter: 'Second', weight: '76' })];
  const got = findRecord(rows, {
    ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch',
  });
  assert.strictEqual(got.lifter, 'Second');
  assert.strictEqual(got.weight, '76');
});

test('STANDARD placeholder rows are returned, not rejected', () => {
  // Gating those is a UI concern; the endpoint is a general-purpose renderer.
  const rows = [HEADER, row({ lifter: 'STANDARD', date: '', event: '' })];
  const got = findRecord(rows, {
    ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch',
  });
  assert.strictEqual(got.lifter, 'STANDARD');
  assert.strictEqual(got.date, null);
  assert.strictEqual(got.event, null);
});

test('ragged adaptive rows missing date and meet yield nulls, not undefined', () => {
  // The adaptive tabs have 13 columns and the API trims trailing empties, so a row with no
  // meet comes back 11 wide.
  const short = ['Norcal', 'CNC', 'Open', 'F', '0', '999', '49', '53', 'Snatch', '76', 'Nobody'];
  assert.strictEqual(short.length, 11);
  const got = findRecord([HEADER, short], {
    ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch',
  });
  assert.strictEqual(got.lifter, 'Nobody');
  assert.strictEqual(got.date, null);
  assert.strictEqual(got.event, null);
});

test('a lift name containing an ampersand matches exactly', () => {
  const rows = [HEADER, row({ lift: 'Clean & Jerk', weight: '95' })];
  assert.strictEqual(
    findRecord(rows, { ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Clean & Jerk' })
      .weight,
    '95'
  );
});

test('unknown parameters return null', () => {
  const rows = [HEADER, row()];
  const base = { ageGroup: 'OPEN', gender: 'female', weightClass: '53', lift: 'Snatch' };
  assert.strictEqual(findRecord(rows, { ...base, ageGroup: 'U15' }), null);
  assert.strictEqual(findRecord(rows, { ...base, weightClass: '49' }), null);
  assert.strictEqual(findRecord(rows, { ...base, lift: 'Total' }), null);
  assert.strictEqual(findRecord([], base), null);
  assert.strictEqual(findRecord(undefined, base), null);
});
