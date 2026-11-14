/**
 * Writes starter tabs as CSV files for importing into Google Sheets by hand. Each file is named
 * after its tab, because File > Import > "Insert new sheet(s)" names the new tab after the file.
 */

const fs = require('fs');
const path = require('path');

/** RFC 4180: a field holding a comma, quote or line break is quoted, with quotes doubled. */
function escapeCsvField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n') + '\r\n';
}

function csvPathFor(dir, tabName) {
  return path.join(dir, `${tabName}.csv`);
}

/** The files among `tabs` that already exist in `dir`. */
function existingCsvFiles(dir, tabs) {
  return tabs.map((tab) => csvPathFor(dir, tab.name)).filter((file) => fs.existsSync(file));
}

/**
 * @param {string} dir created if missing
 * @param {Array<{ name: string, rows: string[][] }>} tabs
 * @returns {string[]} the paths written
 */
function writeCsvTabs(dir, tabs) {
  fs.mkdirSync(dir, { recursive: true });
  return tabs.map((tab) => {
    const file = csvPathFor(dir, tab.name);
    fs.writeFileSync(file, toCsv(tab.rows), 'utf-8');
    return file;
  });
}

module.exports = { escapeCsvField, toCsv, existingCsvFiles, writeCsvTabs };
