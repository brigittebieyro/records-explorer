const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const {
  drawCenteredRuns,
  drawCenteredWrapped,
  wrapRunToWidth,
  buildCertificateLines,
  renderCertificate,
  formatDate,
  encodeStringForFileName,
  certificateFileName,
  SCRIPT,
  BODY,
  BODY_BOLD,
  BODY_ITALIC,
  SCRIPT_FONT_FILE,
  LOGO_FILE,
  BORDER_FILE,
  NAME_FRAME_FILE,
} = require('./render');

const RECORD = {
  weight: '76', lifter: 'Jade Morales', date: '2026-06-23',
  event: '2026 USAW National Championships & Mountain North WSO Championships',
  ageGroupId: 'OPEN', gender: 'F', weightClass: '53', lift: 'Snatch',
  sheetName: 'Post-Aug2026',
  category: "Women's Open 53kg",
};

const textOf = (lines) => lines.map((l) => l.runs.map((r) => r.text).join(''));

// ---------------------------------------------------------------------------------------------
// Assets. doc.font() calls fontkit.openSync(), so these must be real files at test time -- do
// not mock them. A cheap sfnt-magic check makes a missing or corrupt font fail legibly rather
// than as an opaque fontkit error inside a render.
// ---------------------------------------------------------------------------------------------

test('the script font asset exists and is a valid sfnt', () => {
  assert.ok(fs.existsSync(SCRIPT_FONT_FILE), `missing font: ${SCRIPT_FONT_FILE}`);
  const magic = fs.readFileSync(SCRIPT_FONT_FILE).subarray(0, 4);
  const valid = [Buffer.from([0, 1, 0, 0]), Buffer.from('true'), Buffer.from('OTTO')];
  assert.ok(valid.some((v) => magic.equals(v)), `not an sfnt font: ${magic.toString('hex')}`);
});

test('every image asset exists and is an 8-bit non-palette PNG', () => {
  for (const file of [LOGO_FILE, BORDER_FILE, NAME_FRAME_FILE]) {
    assert.ok(fs.existsSync(file), `missing image: ${file}`);
    const png = fs.readFileSync(file);
    const bitDepth = png.readUInt8(24);
    const colorType = png.readUInt8(25);
    // PDFKit throws on palette (3) and on 16-bit depth.
    assert.strictEqual(bitDepth, 8, `PDFKit cannot embed 16-bit PNGs: ${file}`);
    assert.notStrictEqual(colorType, 3, `PDFKit cannot embed palette PNGs: ${file}`);
  }
});

// ---------------------------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------------------------

test('formatDate handles both sheet formats and degrades on anything else', () => {
  assert.strictEqual(formatDate('2026-06-23'), 'June 23, 2026'); // production tab
  assert.strictEqual(formatDate('10/18/2025'), 'October 18, 2025'); // test sheet tab
  assert.strictEqual(formatDate('2025-1-5'), 'January 5, 2025');
  assert.strictEqual(formatDate('sometime in June'), 'sometime in June');
  assert.strictEqual(formatDate(''), null);
  assert.strictEqual(formatDate(null), null);
  assert.strictEqual(formatDate(undefined), null);
});

test('formatDate renders a whole date written in any other format', () => {
  // Hand-entered certificates are not limited to what the sheets write.
  assert.strictEqual(formatDate('May 4, 2019'), 'May 4, 2019');
  assert.strictEqual(formatDate('4 May 2019'), 'May 4, 2019');
  assert.strictEqual(formatDate('Oct 18, 2025'), 'October 18, 2025');
  assert.strictEqual(formatDate('18 October 2025'), 'October 18, 2025');
  assert.strictEqual(formatDate('12-25-2020'), 'December 25, 2020');
  assert.strictEqual(formatDate('2019/05/04'), 'May 4, 2019');
});

test('formatDate never invents the parts of a partial date', () => {
  // The runtime's parser fills these in silently -- 'Spring 1998' comes back as January 1st, and
  // a bare '1998' as the New Year's Eve before it -- and printing either as an exact day would be
  // inventing the date of a record. They are printed as written instead.
  assert.strictEqual(formatDate('Spring 1998'), 'Spring 1998');
  assert.strictEqual(formatDate('1998'), '1998');
  assert.strictEqual(formatDate('May 2019'), 'May 2019');
  assert.strictEqual(formatDate('March 3rd, 2020'), 'March 3rd, 2020');
});

test('formatDate renders the same day whatever zone the client names', () => {
  // The day is pinned at noon UTC, so a record's date cannot drift onto a neighbouring day.
  for (const zone of ['America/Los_Angeles', 'America/New_York', 'UTC', 'Asia/Kolkata']) {
    assert.strictEqual(formatDate('2019-05-04', zone), 'May 4, 2019');
    assert.strictEqual(formatDate('May 4, 2019', zone), 'May 4, 2019');
  }
});

test('formatDate falls back to UTC rather than throwing on a zone it does not know', () => {
  assert.strictEqual(formatDate('2019-05-04', 'Mars/Olympus_Mons'), 'May 4, 2019');
  assert.strictEqual(formatDate('2019-05-04', undefined), 'May 4, 2019');
  assert.strictEqual(formatDate('2019-05-04', ''), 'May 4, 2019');
});

test('formatDate never prints the word undefined for an impossible month', () => {
  // MONTHS is indexed directly, so an out-of-range month used to render as "undefined 4, 2019".
  assert.strictEqual(formatDate('2019-13-04'), '2019-13-04');
  assert.strictEqual(formatDate('0/5/2019'), '0/5/2019');
});

// ---------------------------------------------------------------------------------------------
// Download naming
// ---------------------------------------------------------------------------------------------

test('encodeStringForFileName returns an ASCII token, whatever the cell held', () => {
  assert.strictEqual(encodeStringForFileName('Jane Doe'), 'JaneDoe');
  // Accented letters keep their base form rather than vanishing.
  assert.strictEqual(encodeStringForFileName('José Álvarez'), 'JoseAlvarez');
  // A date the sheet wrote with slashes stays readable.
  assert.strictEqual(encodeStringForFileName('10/18/2025'), '10-18-2025');
  assert.strictEqual(encodeStringForFileName('2025-10-18'), '2025-10-18');
  // A quote or newline in a cell cannot reach the Content-Disposition header.
  assert.strictEqual(encodeStringForFileName('Jane "JD"\nDoe'), 'Jane-JD-Doe');
  assert.strictEqual(encodeStringForFileName("O'Brien-Smith"), 'O-Brien-Smith');
  assert.strictEqual(encodeStringForFileName(''), '');
  assert.strictEqual(encodeStringForFileName(null), '');
  assert.strictEqual(encodeStringForFileName(undefined), '');
});

test('certificateFileName is AthleteName_Lift_<date>.pdf', () => {
  assert.strictEqual(
    certificateFileName({ lifter: 'Jane Doe', lift: 'Snatch', date: '2025-10-18' }),
    'JaneDoe_Snatch_2025-10-18.pdf'
  );
  assert.strictEqual(
    certificateFileName({ lifter: 'Jane Doe', lift: 'Total', date: '10/18/2025' }),
    'JaneDoe_Total_10-18-2025.pdf'
  );
  // The three lifts an athlete can hold stay tellable apart, ampersand and all.
  assert.strictEqual(
    certificateFileName({ lifter: 'Jane Doe', lift: 'Clean & Jerk', date: '2025-10-18' }),
    'JaneDoe_Clean-Jerk_2025-10-18.pdf'
  );
});

test('certificateFileName closes the gap when a part is missing', () => {
  // A row with no date is normal on the adaptive tabs -- no trailing separator.
  assert.strictEqual(
    certificateFileName({ lifter: 'Jane Doe', lift: 'Snatch', date: null }),
    'JaneDoe_Snatch.pdf'
  );
  assert.strictEqual(
    certificateFileName({ lifter: '', lift: 'Snatch', date: '2025-10-18' }),
    'Snatch_2025-10-18.pdf'
  );
  // The lift is required on the request, so this only guards the middle from collapsing away.
  assert.strictEqual(
    certificateFileName({ lifter: 'Jane Doe', date: '2025-10-18' }),
    'JaneDoe_Record_2025-10-18.pdf'
  );
  assert.strictEqual(certificateFileName({}), 'Record.pdf');
});

// ---------------------------------------------------------------------------------------------
// buildCertificateLines -- pure, so most assertions live here rather than against a PDF.
// ---------------------------------------------------------------------------------------------

test('buildCertificateLines produces the certificate copy in order', () => {
  assert.deepStrictEqual(textOf(buildCertificateLines(RECORD)), [
    'California North Central WSO',
    'hereby certifies that',
    'Jade Morales',
    "has established the following record for the Women's Open 53kg category:",
    '76kg Snatch',
    'on June 23, 2026',
  ]);
});

test('the meet name is deliberately not printed', () => {
  // The designed sample omits it. RECORD carries one, so this pins the omission as a choice
  // rather than letting it come back by accident.
  const rendered = textOf(buildCertificateLines(RECORD)).join(' | ');
  assert.ok(RECORD.event);
  assert.ok(!rendered.includes(RECORD.event), 'the meet name should not appear');
});

test('fonts follow the design: script title, bold name, italic prose, roman record', () => {
  const byId = Object.fromEntries(
    buildCertificateLines(RECORD).map((l) => [l.id, l.runs.map((r) => r.font)])
  );
  assert.deepStrictEqual(byId.title, [SCRIPT]);
  assert.deepStrictEqual(byId.lifter, [BODY_BOLD]);
  assert.deepStrictEqual(byId.preamble, [BODY_ITALIC]);
  assert.deepStrictEqual(byId.category, [BODY_ITALIC]);
  assert.deepStrictEqual(byId.date, [BODY_ITALIC]);
  assert.deepStrictEqual(byId.record, [BODY]);
});

test('every line has a distinct, increasing baseline', () => {
  const ys = buildCertificateLines(RECORD).map((l) => l.y);
  assert.deepStrictEqual(ys, [...ys].sort((a, b) => a - b));
  assert.strictEqual(new Set(ys).size, ys.length);
});



test('the class wording is printed exactly as supplied', () => {
  // The server keeps no copy of the display strings; src/Data is the single source of truth and
  // the client composes the line. Whatever arrives is what prints.
  const lines = buildCertificateLines({
    ...RECORD,
    category: 'Adaptive (Physical Disability) Girls Under 11 Age Group 30kg',
  });
  assert.strictEqual(
    textOf(lines)[3],
    'has established the following record for the Adaptive (Physical Disability) Girls ' +
      'Under 11 Age Group 30kg category:'
  );
});

test('without a category the sentence still closes cleanly', () => {
  for (const category of [undefined, null, '']) {
    const lines = buildCertificateLines({ ...RECORD, category });
    assert.strictEqual(textOf(lines)[3], 'has established the following record:');
  }
});

test('a missing date drops only the date line', () => {
  const noDate = buildCertificateLines({ ...RECORD, date: null });
  assert.deepStrictEqual(textOf(noDate).slice(-1), ['76kg Snatch']);
  assert.strictEqual(noDate.length, 5);
  assert.ok(!noDate.some((l) => l.id === 'date'));
});

test('the kg suffix attaches to the weight, not the lift', () => {
  const lines = buildCertificateLines({ ...RECORD, weight: '105', lift: 'Clean & Jerk' });
  assert.strictEqual(textOf(lines)[4], '105kg Clean & Jerk');
});

// ---------------------------------------------------------------------------------------------
// drawCenteredRuns -- fake-doc spy, no PDF involved.
// ---------------------------------------------------------------------------------------------

function fakeDoc(charWidth = 10) {
  const calls = [];
  let active = null;
  return {
    calls,
    font(name) { active = { ...(active || {}), font: name }; return this; },
    fontSize(size) { active = { ...(active || {}), size }; return this; },
    widthOfString(text) { return text.length * charWidth * (active.size / 10); },
    text(str, x, y, opts) { calls.push({ str, x, y, opts, font: active.font, size: active.size }); },
  };
}

test('drawCenteredRuns centers the whole line, not each run', () => {
  const doc = fakeDoc();
  // Two runs of equal width: the line spans 2*(4*10) = 80, so it starts 40 left of center.
  drawCenteredRuns(doc, [
    { text: 'aaaa', font: BODY, size: 10 },
    { text: 'bbbb', font: SCRIPT, size: 10 },
  ], { centerX: 100, baselineY: 200 });

  assert.strictEqual(doc.calls.length, 2);
  assert.strictEqual(doc.calls[0].x, 60);
  assert.strictEqual(doc.calls[1].x, 100); // starts where the first run ended
  // Symmetric about the center, and sharing one baseline.
  const start = doc.calls[0].x;
  const end = doc.calls[1].x + 40;
  assert.strictEqual(100 - start, end - 100);
  assert.ok(doc.calls.every((c) => c.y === 200));
});

test('drawCenteredRuns draws each run under its own font', () => {
  const doc = fakeDoc();
  drawCenteredRuns(doc, [
    { text: 'one', font: BODY, size: 12 },
    { text: 'two', font: SCRIPT, size: 20 },
  ], { centerX: 100, baselineY: 50 });
  assert.deepStrictEqual(doc.calls.map((c) => c.font), [BODY, SCRIPT]);
  assert.deepStrictEqual(doc.calls.map((c) => c.size), [12, 20]);
});

test('drawCenteredRuns always passes lineBreak:false and baseline:alphabetic', () => {
  const doc = fakeDoc();
  drawCenteredRuns(doc, [
    { text: 'a', font: BODY, size: 10 },
    { text: 'b', font: SCRIPT, size: 10 },
  ], { centerX: 100, baselineY: 50 });
  for (const c of doc.calls) {
    assert.strictEqual(c.opts.lineBreak, false);
    assert.strictEqual(c.opts.baseline, 'alphabetic');
    // Never alongside a manual x, or the line is centered twice.
    assert.strictEqual(c.opts.align, undefined);
    assert.strictEqual(c.opts.width, undefined);
  }
});

test('drawCenteredRuns shrinks a line proportionally to fit maxWidth', () => {
  const doc = fakeDoc();
  // Natural width 20*10 = 200, capped at 100 -> scale 0.5.
  const r = drawCenteredRuns(doc, [{ text: 'x'.repeat(20), font: BODY, size: 10 }], {
    centerX: 100, baselineY: 50, maxWidth: 100,
  });
  assert.ok(r.scaled);
  assert.strictEqual(r.scale, 0.5);
  assert.strictEqual(r.width, 100);
  assert.strictEqual(doc.calls[0].size, 5);
  assert.strictEqual(doc.calls[0].x, 50);
});

test('drawCenteredRuns leaves a line that already fits alone', () => {
  const doc = fakeDoc();
  const r = drawCenteredRuns(doc, [{ text: 'short', font: BODY, size: 10 }], {
    centerX: 100, baselineY: 50, maxWidth: 500,
  });
  assert.strictEqual(r.scaled, false);
  assert.strictEqual(r.scale, 1);
  assert.strictEqual(doc.calls[0].size, 10);
});

// ---------------------------------------------------------------------------------------------
// Wrapping. Long categories must wrap at full size, never shrink.
// ---------------------------------------------------------------------------------------------

test('wrapRunToWidth breaks on word boundaries', () => {
  const doc = fakeDoc(); // 10pt per character at size 10
  const run = { text: 'aaa bbb ccc ddd', font: BODY, size: 10 };
  // 70pt fits 'aaa bbb' (7 chars) but not 'aaa bbb ccc' (11).
  assert.deepStrictEqual(wrapRunToWidth(doc, run, 70), ['aaa bbb', 'ccc ddd']);
  assert.deepStrictEqual(wrapRunToWidth(doc, run, 1000), ['aaa bbb ccc ddd']);
});

test('wrapRunToWidth keeps an over-long single word rather than dropping it', () => {
  const doc = fakeDoc();
  const run = { text: 'Featherstonehaugh', font: BODY, size: 10 };
  assert.deepStrictEqual(wrapRunToWidth(doc, run, 20), ['Featherstonehaugh']);
});

test('drawCenteredWrapped never shrinks the font', () => {
  const doc = fakeDoc();
  const run = { text: 'aaa bbb ccc ddd', font: BODY, size: 10 };
  drawCenteredWrapped(doc, run, { centerX: 100, baselineY: 200, maxWidth: 70, leading: 13 });
  // Every drawn line keeps the declared size -- this is the whole point of wrapping instead of
  // scaling to fit.
  assert.ok(doc.calls.length >= 2);
  assert.ok(doc.calls.every((c) => c.size === 10), doc.calls.map((c) => c.size).join(','));
});

test('drawCenteredWrapped anchors the first line and grows downward', () => {
  const doc = fakeDoc();
  const run = { text: 'aaa bbb ccc ddd', font: BODY, size: 10 };
  const r = drawCenteredWrapped(doc, run, {
    centerX: 100, baselineY: 200, maxWidth: 70, leading: 13,
  });
  assert.deepStrictEqual(r.lines, ['aaa bbb', 'ccc ddd']);
  // First line stays put; the second grows into the space below.
  assert.strictEqual(doc.calls[0].y, 200);
  assert.strictEqual(doc.calls[1].y, 213);
  assert.strictEqual(r.extraHeight, 13);
});

test('drawCenteredWrapped reports no extra height for a line that fits', () => {
  const doc = fakeDoc();
  const r = drawCenteredWrapped(doc, { text: 'short', font: BODY, size: 10 }, {
    centerX: 100, baselineY: 200, maxWidth: 500, leading: 13,
  });
  assert.strictEqual(r.extraHeight, 0);
  assert.strictEqual(doc.calls.length, 1);
  assert.strictEqual(doc.calls[0].y, 200);
});

test('the category line is the only one marked for wrapping', () => {
  const wrapping = buildCertificateLines(RECORD).filter((l) => l.wrap).map((l) => l.id);
  // The lifter name sits inside fixed-width artwork, so it must shrink, not wrap.
  assert.deepStrictEqual(wrapping, ['category']);
});

test('renderCertificate handles a category long enough to wrap', async () => {
  const buf = await renderCertificate({
    ...RECORD, ageGroupId: '90', weightClass: '>110', gender: 'M',
    sheetName: 'Adaptive_Physical',
  });
  assert.ok(buf.toString('latin1').startsWith('%PDF-'));
  assert.ok(buf.length > 15000);
});

// ---------------------------------------------------------------------------------------------
// renderCertificate -- structural smoke only.
//
// expect(buf.toString()).toContain('Jade Morales') will NOT work: content streams are
// Flate-compressed, and PDFKit emits hex glyph strings which for an embedded subset are
// arbitrary glyph ids unrelated to the source characters. So assert against the uncompressed
// object dictionaries instead. These strings were captured from the Phase 0 spike.
// ---------------------------------------------------------------------------------------------

test('renderCertificate produces a well-formed landscape Letter PDF', async () => {
  const buf = await renderCertificate(RECORD);
  assert.ok(Buffer.isBuffer(buf));
  const raw = buf.toString('latin1');

  assert.ok(raw.startsWith('%PDF-'), 'missing %PDF- header');
  assert.ok(raw.trimEnd().endsWith('%%EOF'), 'missing %%EOF trailer');
  assert.match(raw, /\/MediaBox \[0 0 792 612\]/); // landscape US Letter
  assert.match(raw, /\/BaseFont \/Times-Roman/);
  assert.match(raw, /\/BaseFont \/Times-Bold/); // the lifter name
  assert.match(raw, /\/BaseFont \/Times-Italic/); // the prose lines
  assert.match(raw, /\/BaseFont \/[A-Z]{6}\+ImperialScript/); // subset actually embedded
  assert.match(raw, /\/Subtype \/Image/); // the logo really made it in
  assert.ok(buf.length > 15000, `suspiciously small: ${buf.length} bytes`);
});

test('renderCertificate handles a record with no date', async () => {
  const buf = await renderCertificate({ ...RECORD, lifter: 'STANDARD', date: null, event: null });
  assert.ok(buf.length > 15000);
  assert.ok(buf.toString('latin1').startsWith('%PDF-'));
});

test('renderCertificate survives a very long lifter name', async () => {
  // The name is drawn inside a fixed-width banner, so it must shrink rather than run past the
  // artwork's flared ends.
  const buf = await renderCertificate({
    ...RECORD,
    lifter: 'Bartholomew Featherstonehaugh-Vance the Third',
  });
  assert.ok(buf.toString('latin1').startsWith('%PDF-'));
});

test('renderCertificate embeds the border, logo and name frame', async () => {
  const raw = (await renderCertificate(RECORD)).toString('latin1');
  // Each RGBA PNG becomes two image XObjects -- the colour data and an /SMask carrying the
  // alpha channel -- so three source images produce six of one and three of the other.
  const images = raw.match(/\/Subtype \/Image/g) || [];
  const masks = raw.match(/\/SMask/g) || [];
  assert.strictEqual(masks.length, 3, `expected 3 alpha masks, found ${masks.length}`);
  assert.strictEqual(images.length, 6, `expected 6 image objects, found ${images.length}`);
});
