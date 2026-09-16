const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ASSETS = path.join(__dirname, 'assets');
const SCRIPT_FONT_FILE = path.join(ASSETS, 'ImperialScript-Regular.ttf');
// PDFKit throws on palette (color type 3) and 16-bit PNGs. All three of these are 8-bit RGBA --
// do not re-export any of them as indexed to save bytes.
const LOGO_FILE = path.join(ASSETS, 'WSOLogo.png');
const BORDER_FILE = path.join(ASSETS, 'Border.png');
const NAME_FRAME_FILE = path.join(ASSETS, 'NameFrame.png');

// The border artwork's pixel size, and where its inner white field begins as a fraction of that
// -- measured off the PNG itself, so the website can be tucked into the real inside corner
// rather than a guessed offset from the page edge.
const BORDER_SIZE = { width: 700, height: 546 };
const BORDER_INNER_EDGE = { right: 0.9614, bottom: 0.9524 };
const CORNER_PADDING = 12;

// The logo's vertical centre. Held fixed so resizing the logo grows it symmetrically rather
// than pushing it into the line below.
const LOGO_CENTER_Y = 210;

const SCRIPT = 'Script';
// Base-14 standard fonts. Viewers render these as Times New Roman (or a metric-identical
// substitute), so we get it without shipping a font file that is not redistributable.
const BODY = 'Times-Roman';
const BODY_BOLD = 'Times-Bold';
const BODY_ITALIC = 'Times-Italic';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The sheets disagree on date format -- production writes 2025-10-18, the test sheet writes
 * 10/18/2025 -- and neither reads well on a formal certificate. Parsing both keeps the output
 * identical whichever sheet the server is pointed at; an unrecognised format degrades to the
 * raw string rather than throwing.
 */
function formatDate(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${+m[1]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${MONTHS[+m[1] - 1]} ${+m[2]}, ${+m[3]}`;
  return s;
}

/**
 * Encodes an arbitrary string as a single ASCII filename token.
 *
 * Accents are decomposed first so an accented letter keeps its base form -- 'é' becomes 'e'
 * rather than being lost. Whitespace is then dropped rather than replaced, so a separator placed
 * around the token stays meaningful, and everything outside [A-Za-z0-9.-] collapses to '-', which
 * keeps punctuation-separated values readable.
 *
 * The result is plain ASCII, so it needs no further encoding to go on a filesystem or into a
 * header. It is '' when nothing survives -- a name written in a script with no ASCII form, say --
 * and callers decide what an empty token means.
 */
function encodeStringForFileName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
}

/**
 * The download name for a record's certificate: AthleteName_Lift_<date>.pdf
 *
 * The middle part is the lift, which is what kind of record this is -- an athlete who holds all
 * three gets three files that sort together and stay tellable apart. It is required on the
 * request, so 'Record' is only a floor for a row that somehow carries none.
 *
 * The date is whatever the sheet holds, only made filename-safe -- the tabs disagree on format
 * (see formatDate), and that only matters for the certificate's own text, not for this.
 *
 * Either outer part can be missing -- an unnamed holder, or a row with no date -- so the parts
 * are joined rather than interpolated, and a gap closes up instead of leaving a stray separator.
 */
function certificateFileName(record) {
  const name = encodeStringForFileName(record && record.lifter);
  const lift = encodeStringForFileName(record && record.lift) || 'Record';
  const when = encodeStringForFileName(record && record.date);
  return `${[name, lift, when].filter(Boolean).join('_')}.pdf`;
}

/**
 * Draws a line made of runs that may each use a different font, centered as a whole.
 *
 * `continued: true` + align:'center' does NOT center a multi-run line -- each fragment centers
 * independently. So measure every run under its own font, sum, compute the start x, and draw at
 * explicit positions. Today every line happens to be a single run, but the certificate copy has
 * already changed once; keeping one code path means it cannot regress when it changes again.
 *
 * @returns {{scaled: boolean, scale: number, width: number}}
 */
function drawCenteredRuns(doc, runs, { centerX, baselineY, maxWidth }) {
  const measure = (scale) => {
    let total = 0;
    // widthOfString measures under the *currently active* font, so set font and size
    // immediately before each measurement.
    const widths = runs.map((r) => {
      doc.font(r.font).fontSize(r.size * scale);
      const w = doc.widthOfString(r.text);
      total += w;
      return w;
    });
    return { total, widths };
  };

  let scale = 1;
  let { total, widths } = measure(scale);
  if (maxWidth && total > maxWidth) {
    scale = maxWidth / total;
    ({ total, widths } = measure(scale));
  }

  let x = centerX - total / 2;
  runs.forEach((r, i) => {
    doc.font(r.font).fontSize(r.size * scale);
    // baseline:'alphabetic' is essential -- by default y is the top of the line box and PDFKit
    // shifts down by ascender/1000*size, which differs wildly between a script face and Times.
    // lineBreak:false prevents mid-phrase wrapping and stops doc.y advancing. Never pass
    // align/width alongside a manual x, or the line is centered twice.
    doc.text(r.text, x, baselineY, { lineBreak: false, baseline: 'alphabetic' });
    x += widths[i];
  });
  return { scaled: scale < 1, scale, width: total };
}

/**
 * Greedily breaks one single-font run into lines that each fit `maxWidth`.
 *
 * A word longer than maxWidth on its own is left over-long rather than hyphenated or dropped --
 * that only happens for input that is already pathological, and losing characters would be worse.
 */
function wrapRunToWidth(doc, run, maxWidth) {
  doc.font(run.font).fontSize(run.size);
  const lines = [];
  let current = '';
  for (const word of String(run.text).split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && doc.widthOfString(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Draws a single-font run centered, wrapping onto extra lines instead of shrinking.
 *
 * The first line stays on `baselineY` and extra lines grow downward, into the gap the design
 * leaves beneath this block. Centering the block on `baselineY` instead would push the first
 * line up into the name banner.
 *
 * @returns {{lines: string[], extraHeight: number}} extraHeight is how far everything below
 *   this block needs to shift to keep its spacing.
 */
function drawCenteredWrapped(doc, run, { centerX, baselineY, maxWidth, leading }) {
  const wrapped = wrapRunToWidth(doc, run, maxWidth);
  const step = leading || run.size * 1.25;
  wrapped.forEach((text, i) => {
    // No maxWidth here: the text has already been broken to fit, and passing one would
    // re-introduce the shrinking this function exists to avoid.
    drawCenteredRuns(doc, [{ ...run, text }], { centerX, baselineY: baselineY + i * step });
  });
  return { lines: wrapped, extraHeight: (wrapped.length - 1) * step };
}

/** Same placement model, anchored to a right edge instead of a center. */
function drawRightAligned(doc, run, { rightX, baselineY }) {
  doc.font(run.font).fontSize(run.size);
  const w = doc.widthOfString(run.text);
  doc.text(run.text, rightX - w, baselineY, { lineBreak: false, baseline: 'alphabetic' });
  return { width: w };
}

/**
 * PURE. Turns a record into the centered lines of the certificate. The caller owns vertical
 * layout via explicit baseline Y values -- currentLineHeight() is unreliable when the active
 * font keeps changing.
 *
 * @param {object} record as returned by findRecord, plus `sheetName`
 * @returns {Array<{y: number, runs: Array<{text: string, font: string, size: number}>}>}
 */
function buildCertificateLines(record) {
  // Everything from the preamble down sits half a line (~11pt) lower than the logo block, so the
  // centred text reads as its own group rather than crowding the crest.
  const lines = [
    // Title sits above the logo.
    { id: 'title', y: 142, runs: [{ text: 'California North Central WSO', font: SCRIPT, size: 46 }] },
    { id: 'preamble', y: 287, runs: [{ text: 'hereby certifies that', font: BODY_ITALIC, size: 17 }] },
    // Drawn inside the name frame banner, so it gets its own narrower maxWidth.
    { id: 'lifter', y: 337, runs: [{ text: record.lifter, font: BODY_BOLD, size: 24 }] },
    {
      id: 'category',
      y: 381,
      // Long adaptive/masters categories wrap onto a second line rather than shrinking; the
      // design leaves vertical room for one.
      wrap: true,
      runs: [
        {
          // The class wording is composed by the client from src/Data and passed through
          // verbatim. Without one, the sentence still has to close cleanly.
          text: record.category
            ? `has established the following record for the ${record.category} category:`
            : 'has established the following record:',
          font: BODY_ITALIC,
          size: 17,
        },
      ],
    },
    { id: 'record', y: 417, runs: [{ text: `${record.weight}kg ${record.lift}`, font: BODY, size: 22 }] },
  ];

  // The date sits tight under the record rather than in its own block. It can be missing: the
  // adaptive tabs trim trailing empty cells, and STANDARD rows never have one.
  const when = formatDate(record.date);
  if (when) {
    lines.push({ id: 'date', y: 437, runs: [{ text: `on ${when}`, font: BODY_ITALIC, size: 15 }] });
  }

  return lines;
}

/**
 * @param {object} record as returned by findRecord, plus `sheetName`
 * @returns {Promise<Buffer>}
 */
function renderCertificate(record) {
  return new Promise((resolve, reject) => {
    let doc;
    try {
      doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 54 });
    } catch (err) {
      reject(err);
      return;
    }

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont(SCRIPT, SCRIPT_FONT_FILE);

      const centerX = doc.page.width / 2;
      const maxWidth = doc.page.width - 200;

      // Every doc.image() below is guarded: on a missing file it throws synchronously, and a
      // missing decoration must not 500 the certificate.

      // Ornamental border, fitted to its own 700x546 aspect rather than stretched to the page.
      // The page is 1.294:1 and the artwork 1.282:1, so stretching would distort the scallops;
      // fitting to the vertical inset and centering horizontally keeps them round.
      const BORDER_INSET_Y = 26;
      const BORDER_ASPECT = BORDER_SIZE.width / BORDER_SIZE.height;
      const borderHeight = doc.page.height - BORDER_INSET_Y * 2;
      const borderWidth = borderHeight * BORDER_ASPECT;
      const borderX = centerX - borderWidth / 2;
      if (fs.existsSync(BORDER_FILE)) {
        doc.image(BORDER_FILE, borderX, BORDER_INSET_Y, {
          width: borderWidth,
          height: borderHeight,
        });
      }

      if (fs.existsSync(LOGO_FILE)) {
        const size = 94;
        // Grown from 68 to 82 to 94; held to the same centre each time so it does not crowd the
        // line beneath it.
        doc.image(LOGO_FILE, centerX - size / 2, LOGO_CENTER_Y - size / 2, {
          width: size,
          height: size,
        });
      }

      // Name banner. Its aspect ratio is fixed by the artwork, so derive the height from the
      // width rather than stretching it.
      const NAME_FRAME_WIDTH = 530;
      const NAME_FRAME_ASPECT = 610 / 56;
      const nameFrameHeight = NAME_FRAME_WIDTH / NAME_FRAME_ASPECT;
      const NAME_FRAME_CENTER_Y = 329;
      const nameFrameTop = NAME_FRAME_CENTER_Y - nameFrameHeight / 2;
      if (fs.existsSync(NAME_FRAME_FILE)) {
        doc.image(NAME_FRAME_FILE, centerX - NAME_FRAME_WIDTH / 2, nameFrameTop, {
          width: NAME_FRAME_WIDTH,
          height: nameFrameHeight,
        });
      }

      // A wrapped block pushes everything below it down, so single-line certificates lay out
      // exactly as designed and only a wrapping one reflows.
      let shift = 0;
      for (const line of buildCertificateLines(record)) {
        if (line.wrap) {
          const { extraHeight } = drawCenteredWrapped(doc, line.runs[0], {
            centerX,
            baselineY: line.y + shift,
            maxWidth,
            leading: line.runs[0].size * 1.3,
          });
          shift += extraHeight;
          continue;
        }
        // The lifter name is drawn inside the banner, so it cannot wrap -- it must shrink to the
        // banner's inner width, clearing the artwork's flared ends.
        const lineMaxWidth = line.id === 'lifter' ? NAME_FRAME_WIDTH - 72 : maxWidth;
        drawCenteredRuns(doc, line.runs, {
          centerX,
          baselineY: line.y + shift,
          maxWidth: lineMaxWidth,
        });
      }

      // Tucked into the bottom-right inside corner of the border, derived from the artwork's
      // own inner edges so it follows if the border placement ever changes.
      drawRightAligned(
        doc,
        { text: 'www.canorthcentralwso.org', font: BODY, size: 9 },
        {
          rightX: borderX + borderWidth * BORDER_INNER_EDGE.right - CORNER_PADDING,
          baselineY: BORDER_INSET_Y + borderHeight * BORDER_INNER_EDGE.bottom - CORNER_PADDING,
        }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  drawCenteredRuns,
  drawCenteredWrapped,
  wrapRunToWidth,
  drawRightAligned,
  buildCertificateLines,
  renderCertificate,
  formatDate,
  encodeStringForFileName,
  certificateFileName,
  SCRIPT,
  BODY,
  BODY_BOLD,
  SCRIPT_FONT_FILE,
  BORDER_FILE,
  NAME_FRAME_FILE,
  BODY_ITALIC,
  LOGO_FILE,
};
