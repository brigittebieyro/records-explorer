/**
 * The few Google Sheets and Drive API calls the setup script makes, over plain fetch with an OAuth
 * access token from scripts/lib/googleAuth.js. Each failure names the step that failed and passes
 * on Google's own explanation, which usually says what to fix (for example, an API that is not
 * turned on for the Cloud project).
 */

const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_URL = 'https://www.googleapis.com/drive/v3/files';

// A new tab's grid must hold its rows; Google's default is 1000 rows by 26 columns.
const gridFor = (rows) => ({
  rowCount: Math.max(1000, rows.length + 100),
  columnCount: Math.max(26, ...rows.map((row) => row.length)),
});

async function call(step, token, url, { method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = json.error?.message || `status ${response.status}`;
    throw new Error(`${step} failed: ${reason}`);
  }
  return json;
}

/** A1 range for a whole tab, quoted so tab names with spaces or punctuation work. */
const tabRange = (tabName) => `'${tabName.replace(/'/g, "''")}'`;

/**
 * Creates a spreadsheet holding `tabs`, each filled with its rows.
 * @param {Array<{ name: string, rows: string[][] }>} tabs
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string }>}
 */
async function createSpreadsheet(token, title, tabs) {
  const created = await call('Creating the spreadsheet', token, SHEETS_URL, {
    method: 'POST',
    body: {
      properties: { title },
      sheets: tabs.map((tab) => ({ properties: { title: tab.name, gridProperties: gridFor(tab.rows) } })),
    },
  });
  await writeTabs(token, created.spreadsheetId, tabs);
  return { spreadsheetId: created.spreadsheetId, spreadsheetUrl: created.spreadsheetUrl };
}

/**
 * Adds `tabs` to an existing spreadsheet and fills them. A tab whose name is already taken is
 * left exactly as it is, so nothing the person already has is overwritten.
 * @returns {Promise<{ added: string[], skipped: string[] }>}
 */
async function addTabs(token, spreadsheetId, tabs) {
  const existing = await call(
    'Reading the spreadsheet',
    token,
    `${SHEETS_URL}/${spreadsheetId}?fields=sheets.properties.title`
  );
  const taken = new Set((existing.sheets ?? []).map((sheet) => sheet.properties.title));
  const toAdd = tabs.filter((tab) => !taken.has(tab.name));
  const skipped = tabs.filter((tab) => taken.has(tab.name)).map((tab) => tab.name);

  if (toAdd.length > 0) {
    await call('Adding tabs', token, `${SHEETS_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: {
        requests: toAdd.map((tab) => ({
          addSheet: { properties: { title: tab.name, gridProperties: gridFor(tab.rows) } },
        })),
      },
    });
    await writeTabs(token, spreadsheetId, toAdd);
  }
  return { added: toAdd.map((tab) => tab.name), skipped };
}

/**
 * Values are entered as if typed (USER_ENTERED), the same as a CSV import: numbers become numbers
 * and text such as '>86' stays text.
 */
async function writeTabs(token, spreadsheetId, tabs) {
  await call('Filling in the tabs', token, `${SHEETS_URL}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: {
      valueInputOption: 'USER_ENTERED',
      data: tabs.map((tab) => ({ range: tabRange(tab.name), values: tab.rows })),
    },
  });
}

/** Shares a spreadsheet as "anyone with the link can view". Needs the Drive API turned on. */
async function shareAnyoneWithLinkCanView(token, spreadsheetId) {
  await call('Sharing the spreadsheet', token, `${DRIVE_URL}/${spreadsheetId}/permissions`, {
    method: 'POST',
    body: { type: 'anyone', role: 'reader' },
  });
}

module.exports = { createSpreadsheet, addTabs, shareAnyoneWithLinkCanView };
