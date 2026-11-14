const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { RECORD_HEADER, buildRecordRows, buildRosterRows } = require('./lib/starterRows');
const { escapeCsvField, toCsv, writeCsvTabs, existingCsvFiles } = require('./lib/csv');
const { REQUIRED_KEYS, buildConfig, checks, extractSheetId, parseList } = require(
  './lib/setupConfig'
);
const { hashPassword } = require('./lib/password');

const rows = buildRecordRows({ recordName: 'Test WSO', standardKey: 'STANDARD' });
const body = rows.slice(1);
const find = (ageGroup, gender, bodyWeightMax, lift = 'Snatch') =>
  body.find(
    (row) => row[2] === ageGroup && row[3] === gender && row[7] === bodyWeightMax && row[8] === lift
  );

test('starter records: header, then one standard of 0 per age group, gender, class and lift', () => {
  assert.deepEqual(rows[0], RECORD_HEADER);
  // 14 age groups on the 16 default classes and the four youth sets (20, 20, 18, 16), times 3 lifts.
  assert.equal(body.length, (14 * 16 + 20 + 20 + 18 + 16) * 3);
  assert.ok(body.every((row) => row.length === RECORD_HEADER.length));
  assert.ok(body.every((row) => row[9] === '0' && row[10] === 'STANDARD'));
  assert.ok(body.every((row) => row[0] === 'Test WSO' && row[1] === 'Test WSO'));
});

test('starter records match the layout the app reads', () => {
  assert.deepEqual(find('Open', 'F', '>86').slice(2, 9), [
    'Open', 'F', '0', '999', '86', '>86', 'Snatch',
  ]);
  // Masters rows are keyed on ageMin, and labelled with W for women and M for men.
  assert.deepEqual(find('W35', 'F', '49').slice(4, 6), ['35', '39']);
  assert.deepEqual(find('M90', 'M', '>110', 'Total').slice(4, 6), ['90', '999']);
  assert.equal(body.filter((row) => /^F\d/.test(row[2])).length, 0);
  // U11 uses its own weight classes.
  assert.deepEqual(find('U11', 'F', '30').slice(4, 8), ['0', '11', '0', '30']);
  assert.equal(find('U11', 'F', '>86'), undefined);
});

test('roster header lists the columns parseAdaptiveRoster looks for, then the four categories', () => {
  const [header] = buildRosterRows();
  assert.deepEqual(header.slice(0, 4), ['Lifter Name', 'USAW Member Number', 'Start Date', 'End Date']);
  assert.equal(header.length, 8);
  assert.equal(header[4], 'Physical Disability');
});

test('CSV fields are quoted only when they hold a comma, quote or line break', () => {
  assert.equal(escapeCsvField('Clean & Jerk'), 'Clean & Jerk');
  assert.equal(escapeCsvField('>86'), '>86');
  assert.equal(escapeCsvField('Deaf, Deafened'), '"Deaf, Deafened"');
  assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvField('two\nlines'), '"two\nlines"');
  assert.equal(toCsv([['a', 'b,c'], ['', '1']]), 'a,"b,c"\r\n,1\r\n');
});

/** A small RFC 4180 reader, to check that a written file reads back as the rows given. */
function parseCsv(text) {
  const result = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && text[index + 1] === '\n') {
      row.push(field);
      result.push(row);
      row = [];
      field = '';
      index++;
    } else {
      field += char;
    }
  }
  return result;
}

test('CSV files hold exactly the rows the Google API would write', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-csv-'));
  try {
    const tabs = [
      { name: 'Records', rows },
      { name: 'Adaptive_Roster', rows: buildRosterRows() },
    ];
    assert.deepEqual(existingCsvFiles(dir, tabs), []);
    const files = writeCsvTabs(dir, tabs);
    assert.deepEqual(files.map((file) => path.basename(file)), ['Records.csv', 'Adaptive_Roster.csv']);
    assert.deepEqual(parseCsv(fs.readFileSync(files[0], 'utf8')), rows);
    assert.deepEqual(parseCsv(fs.readFileSync(files[1], 'utf8')), buildRosterRows());
    assert.equal(existingCsvFiles(dir, tabs).length, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('extractSheetId takes an id or a spreadsheet link', () => {
  const id = '1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ';
  assert.equal(extractSheetId(id), id);
  assert.equal(extractSheetId(`  https://docs.google.com/spreadsheets/d/${id}/edit#gid=0 `), id);
  assert.equal(extractSheetId(''), undefined);
  assert.equal(extractSheetId('not an id'), undefined);
  assert.equal(extractSheetId('https://example.org/x'), undefined);
});

test('answer checks look at shape only', () => {
  assert.equal(checks.integer('21'), undefined);
  assert.ok(checks.integer('21.5'));
  assert.equal(checks.isoDate('1998-01-01'), undefined);
  assert.ok(checks.isoDate('1998-02-30'));
  assert.ok(checks.isoDate('01/01/1998'));
  assert.equal(checks.webUrl('https://example.org'), undefined);
  assert.ok(checks.webUrl('example.org'));
  assert.equal(checks.optionalWebUrl(''), undefined);
  assert.equal(checks.email('a@b.org'), undefined);
  assert.ok(checks.email('a.b.org'));
  assert.ok(checks.list(' , '));
  assert.deepEqual(parseList('66, 67,,'), ['66', '67']);
});

const required = {
  wsoId: 1,
  wsoOfficialName: 'Test WSO',
  wsoRegions: ['1'],
  wsoStateNames: ['Somewhere'],
  recordTimeZone: 'America/New_York',
  allTimeStartDate: '2000-01-01',
  includeClubNameOnCertificate: false,
  currentRecordsSheetId: 'abc',
  currentRecordsSheetName: 'Records',
  standardKey: 'STANDARD',
  wsoInfoUSAWUrl: 'https://example.org',
  maintainerEmail: 'a@b.org',
  maintainerName: 'A',
  scriptsPassword: hashPassword('pw', 'Test WSO'),
};

test('without adaptive records the config holds only the required settings, in schema order', () => {
  const config = buildConfig(required, undefined);
  assert.deepEqual(Object.keys(config), REQUIRED_KEYS);
});

test('adaptive settings are added when given, leaving out blanks', () => {
  const config = buildConfig(required, {
    allRecordsSheetName: 'Adaptive_All',
    categoryRecordsSheetNames: { physical: 'P', hearing: '', vision: 'V', cognitive: '' },
    liftersListSheetId: 'abc',
    liftersListSheetName: 'Roster',
    optInFormUrl: '',
  });
  assert.deepEqual(config.adaptiveCategoryRecordsSheetNames, { physical: 'P', vision: 'V' });
  assert.equal(config.showAdaptiveRecordsInMenu, true);
  assert.equal('adaptiveOptInFormUrl' in config, false);
  const keys = Object.keys(config);
  assert.ok(keys.indexOf('standardKey') < keys.indexOf('adaptiveAllRecordsSheetName'));
  assert.ok(keys.indexOf('showAdaptiveRecordsInMenu') < keys.indexOf('wsoInfoUSAWUrl'));
});

test('buildConfig refuses a config missing a required setting', () => {
  const { maintainerName, ...rest } = required;
  assert.throws(() => buildConfig(rest, undefined), /maintainerName/);
});

test('the password hash is sha256 hex of password---display name', () => {
  // Same hash as update-password and src/Utils/Utils.ts: sha256 of `${password}---${display name}`.
  assert.equal(
    hashPassword('x', 'California North Central'),
    '7ae0c121a72922df8d5134e8b81378e68c9df904ba226d21efb47bb368dad7de'
  );
});
