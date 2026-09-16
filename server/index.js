const express = require("express");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const cors = require("cors");
const corsAnywhere = require("cors-anywhere");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);
app.use(cors());

// Mount CORS-Anywhere 
const proxyServer = corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [],
  removeHeaders: ["cookie", "cookie2"],
});

app.use('/api/lifter-data', (req, res) => {
  // Rewrite the incoming URL so cors-anywhere sees the target URL as the first path segment
  // Incoming: /api/lifter-data/api/categories/... -> cors-anywhere expects /https://host/api/...
  const targetBase = 'https://admin-usaw-rankings.sport80.com/api/';
  const suffix = req.originalUrl.replace(/^\/api\/lifter-data/, '');
  req.url = `/${targetBase}${suffix}`;
  proxyServer.emit('request', req, res);
});

app.use('/api/local-meets', (req, res) => {
  // Rewrite the incoming URL so cors-anywhere sees the target URL as the first path segment
  // Incoming: /api/local-meets/... -> cors-anywhere expects /https://host/api/...
  const targetBase = 'https://usaweightlifting.sport80.com/api/public/widget';
  const suffix = req.originalUrl.replace(/^\/api\/local-meets/, '');
  req.url = `/${targetBase}${suffix}`;
  proxyServer.emit('request', req, res);
});

app.use('/api/meet-search', (req, res) => {
  // Rewrite the incoming URL so cors-anywhere sees the target URL as the first path segment
  // Incoming: /api/meet-search/... -> cors-anywhere expects /https://host/api/...
  const targetBase = 'https://admin-usaw-rankings.sport80.com/api/events/table/data';
  const suffix = req.originalUrl.replace(/^\/api\/meet-search/, '');
  req.url = `/${targetBase}${suffix}`;
  console.log(`Proxying meet search request to: ${targetBase}${suffix}`);
  proxyServer.emit('request', req, res);
});

app.use('/api/meet-results', (req, res) => {
  // Rewrite the incoming URL so cors-anywhere sees the target URL as the first path segment
  // Incoming: /api/meet-results/... -> cors-anywhere expects /https://host/api/...
  const targetBase = 'https://admin-usaw-rankings.sport80.com/api/events';
  const suffix = req.originalUrl.replace(/^\/api\/meet-results/, '');
  req.url = `/${targetBase}${suffix}`;
  console.log(`Proxying meet results request to: ${targetBase}${suffix}`);
  proxyServer.emit('request', req, res);
});

// Printable record certificates.
//
// POST rather than GET, and deliberately so: the client reads the response as a blob and opens
// an object URL, so the athlete never sees a query string spelling out ageGroup, weightClass and
// lift. A visible URL full of parameters reads like a form submission; an opaque one reads like
// a document.
//
// Mounted BEFORE the build-dir block below: the app.get('*') catch-all inside it would otherwise
// swallow this route, including locally, since build/ exists in the working tree.
//
// The response is buffered rather than piped. You cannot change the status code after piping
// begins, so a mid-render throw would leave a truncated PDF under a 200. A one-page certificate
// is well under 150KB, so there is nothing to gain from streaming, and Content-Length makes the
// browser's inline viewer behave.
const { getRecordRows } = require('./certificate/sheet');
const { findRecord } = require('./certificate/lookup');
const { renderCertificate, certificateFileName } = require('./certificate/render');
const { MAX_CATEGORY_LENGTH } = require('./certificate/labels');

// The JSON body parser is mounted on this ROUTE, never app-wide. The four cors-anywhere routes
// above proxy POSTs whose content-type is application/json (see `headers` in
// src/Data/RoutesAndSettings.ts), and a body parser mounted globally consumes that request
// stream before cors-anywhere forwards it. The upstream then sees a Content-Length it never
// receives a body for, resets the connection, and cors-anywhere reports every proxy failure --
// including that one -- as a flat 404, so the symptom reads as "USAW is 404ing" rather than
// "we ate the body".
//
// Small limit: the payload is six short fields.
const certificateBody = express.json({ limit: '8kb' });

// Which spreadsheet and tab to read are both named by the client, with no default here: src/Data
// is the single source of truth for them, and a default is just a mirror that goes stale quietly.
// getRecordRows validates both before anything is fetched.
app.post('/api/certificate', certificateBody, async (req, res) => {
  const { sheetId, sheet, ageGroup, gender, weightClass, lift, category } = req.body || {};

  if (!ageGroup || !gender || !weightClass || !lift) {
    res.status(400).json({ error: 'ageGroup, gender, weightClass and lift are all required' });
    return;
  }
  if (gender !== 'male' && gender !== 'female') {
    res.status(400).json({ error: "gender must be 'male' or 'female'" });
    return;
  }
  // The class wording is composed by the client from src/Data, which is the single source of
  // truth for it -- the server keeps no copy. It is printed verbatim, so cap the length and
  // strip control characters; omitting it drops the class from the sentence rather than failing.
  if (category !== undefined && typeof category !== 'string') {
    res.status(400).json({ error: 'category must be a single value' });
    return;
  }
  if (category && category.length > MAX_CATEGORY_LENGTH) {
    res.status(400).json({ error: `category must be ${MAX_CATEGORY_LENGTH} characters or fewer` });
    return;
  }
  const printedCategory = category ? category.replace(/[\p{Cc}\p{Cf}]/gu, '').trim() : '';

  let rows;
  try {
    // Throws a SheetError carrying the status: 400 for a malformed id or tab (before any
    // outbound request), 404 for a tab that does not exist, 503 when the Sheets API is
    // unreachable.
    rows = await getRecordRows(sheetId, sheet);
  } catch (err) {
    const status = err.status || 503;
    if (status >= 500) console.error(`[certificate] ${err.message}`);
    res.status(status).json({ error: err.message });
    return;
  }

  const record = findRecord(rows, { ageGroup, gender, weightClass, lift });
  if (!record) {
    res.status(404).json({ error: 'no matching record' });
    return;
  }

  let pdf;
  try {
    pdf = await renderCertificate({
      ...record,
      sheetName: String(sheet).trim(),
      category: printedCategory,
    });
  } catch (err) {
    console.error(`[certificate] render failed: ${err.stack || err.message}`);
    res.status(500).json({ error: 'could not render the certificate' });
    return;
  }

  const filename = certificateFileName(record);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.end(pdf);
});

// Serve React build if available (for containerized deployments)
const path = require('path');
const fs = require('fs');
const buildDir = path.join(__dirname, '..', 'build');

const envConfig = {
  REACT_APP_GOOGLE_API_KEY: process.env.REACT_APP_GOOGLE_API_KEY ?? '',
  REACT_APP_SPORT80_API_TOKEN: process.env.REACT_APP_SPORT80_API_TOKEN ?? '',
};

if (fs.existsSync(buildDir)) {
  // Serve static files from build directory, but not index.html directly
  // (index: false ensures all HTML requests fall through to the catch-all below,
  // where window.__ENV__ is injected at request time)
  app.use(express.static(buildDir, { index: false }));

  // Inject runtime secrets into index.html for SPA routing
  app.get('*', (req, res) => {
    const html = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
    const envScript = `<script>window.__ENV__ = ${JSON.stringify(envConfig)};</script>`;
    res.send(html.replace('</head>', `${envScript}</head>`));
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Express + CORS proxy running on http://0.0.0.0:${PORT}`)
);
