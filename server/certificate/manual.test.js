const test = require('node:test');
const assert = require('node:assert');
const { buildManualRecord, stripUnprintable } = require('./manual');
const { renderCertificate, certificateFileName } = require('./render');

const body = (overrides = {}) => ({
  lifter: 'Jade Morales',
  lift: 'Snatch',
  weight: '76',
  date: '2019-05-04',
  category: "Women's Open 53kg",
  timeZone: 'America/Los_Angeles',
  ...overrides,
});

test('a complete body becomes the record shape the renderer takes', () => {
  assert.deepStrictEqual(buildManualRecord(body()), {
    record: {
      lifter: 'Jade Morales',
      lift: 'Snatch',
      weight: '76',
      date: '2019-05-04',
      category: "Women's Open 53kg",
      timeZone: 'America/Los_Angeles',
    },
  });
});

test('the lift is not checked against a list of the three lifts', () => {
  const { record } = buildManualRecord(body({ lift: 'Snatch (one hand)' }));
  assert.strictEqual(record.lift, 'Snatch (one hand)');
});

test('the weight is printed exactly as it was written', () => {
  assert.strictEqual(buildManualRecord(body({ weight: 76 })).record.weight, '76');
  assert.strictEqual(buildManualRecord(body({ weight: '76.0' })).record.weight, '76.0');
  assert.strictEqual(buildManualRecord(body({ weight: '76.5' })).record.weight, '76.5');
});

test('the date is printed as written, in whatever format the operator chose', () => {
  for (const written of ['2019-05-04', '05/04/2019', 'May 4, 2019', 'Spring 1998']) {
    assert.strictEqual(buildManualRecord(body({ date: written })).record.date, written);
  }
});

test('the time zone is passed through untouched', () => {
  assert.strictEqual(
    buildManualRecord(body({ timeZone: 'Asia/Kolkata' })).record.timeZone,
    'Asia/Kolkata'
  );
});

test('invisible characters are stripped from every printed field', () => {
  // Written as escapes, not pasted: a bidi override in the name would reverse the rest of the
  // line in the PDF, and neither the form nor this file would show that it is there.
  const rightToLeftOverride = '\u202E';
  const zeroWidthSpace = '\u200B';
  const { record } = buildManualRecord(
    body({
      lifter: `Jade${rightToLeftOverride} Morales`,
      category: `Women's${zeroWidthSpace} Open 53kg`,
    })
  );
  assert.strictEqual(record.lifter, 'Jade Morales');
  assert.strictEqual(record.category, "Women's Open 53kg");
});

test('a missing field becomes an empty string, not an error', () => {
  const { record, error } = buildManualRecord({});
  assert.strictEqual(error, undefined);
  assert.deepStrictEqual(record, {
    lifter: '',
    lift: '',
    weight: '',
    date: '',
    category: '',
    timeZone: undefined,
  });
});

test('a missing body is handled rather than throwing', () => {
  assert.strictEqual(buildManualRecord(undefined).record.lifter, '');
});

test('stripUnprintable trims, and survives a value it cannot read', () => {
  assert.strictEqual(stripUnprintable('  Jade Morales  '), 'Jade Morales');
  assert.strictEqual(stripUnprintable(''), '');
  assert.strictEqual(stripUnprintable(null), '');
  assert.strictEqual(stripUnprintable(undefined), '');
  assert.strictEqual(
    stripUnprintable({
      toString() {
        throw new Error('not a string');
      },
    }),
    ''
  );
});

test('the built record renders a PDF and names its file the same way a sheet record does', async () => {
  const { record } = buildManualRecord(body());

  const pdf = await renderCertificate(record);
  assert.ok(Buffer.isBuffer(pdf));
  assert.strictEqual(pdf.subarray(0, 5).toString('latin1'), '%PDF-');

  // The filename comes from the shared helper, so a manual certificate is named exactly as a
  // sheet-backed one for the same athlete, lift and date.
  assert.strictEqual(certificateFileName(record), 'JadeMorales_Snatch_2019-05-04.pdf');
});
