const test = require('node:test');
const assert = require('node:assert/strict');

const { REQUIRED_KEYS, buildConfig, checks, isoDateOneYearAgo, parseList } = require(
  './lib/setupConfig'
);
const { hashPassword } = require('./lib/password');

test('answer checks look at shape only', () => {
  assert.equal(checks.sheetId('1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ'), undefined);
  assert.ok(checks.sheetId('https://docs.google.com/spreadsheets/d/abc/edit'));
  assert.ok(checks.sheetId(''));
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
  const config = buildConfig(required);
  assert.deepEqual(Object.keys(config), REQUIRED_KEYS);
});

test('tracking adaptive records adds only showAdaptiveRecordsInMenu, in schema order', () => {
  const config = buildConfig(required, { trackAdaptiveRecords: true });
  assert.equal(config.showAdaptiveRecordsInMenu, true);
  assert.equal(Object.keys(config).filter((key) => key.startsWith('adaptive')).length, 0);
  const keys = Object.keys(config);
  assert.ok(keys.indexOf('standardKey') < keys.indexOf('showAdaptiveRecordsInMenu'));
  assert.ok(keys.indexOf('showAdaptiveRecordsInMenu') < keys.indexOf('wsoInfoUSAWUrl'));
});

test('localMeetStartDate, when given, is written in schema order after the identity settings', () => {
  const config = buildConfig({ ...required, localMeetStartDate: '2025-11-22' });
  assert.equal(config.localMeetStartDate, '2025-11-22');
  const keys = Object.keys(config);
  assert.ok(keys.indexOf('wsoStateNames') < keys.indexOf('localMeetStartDate'));
  assert.ok(keys.indexOf('localMeetStartDate') < keys.indexOf('includeClubNameOnCertificate'));
});

test('isoDateOneYearAgo is the same calendar day one year back', () => {
  assert.equal(isoDateOneYearAgo(new Date(2026, 10, 22)), '2025-11-22');
  assert.equal(isoDateOneYearAgo(new Date(2026, 0, 5)), '2025-01-05');
  assert.equal(isoDateOneYearAgo(new Date(2028, 1, 29)), '2027-03-01');
});

test('buildConfig refuses a config missing a required setting', () => {
  const { maintainerName, ...rest } = required;
  assert.throws(() => buildConfig(rest), /maintainerName/);
});

test('the password hash is sha256 hex of password---display name', () => {
  // Same hash as update-password and src/Utils/Utils.ts: sha256 of `${password}---${display name}`.
  assert.equal(
    hashPassword('x', 'California North Central'),
    '7ae0c121a72922df8d5134e8b81378e68c9df904ba226d21efb47bb368dad7de'
  );
});
