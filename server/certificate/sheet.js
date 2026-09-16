// Fetches raw rows from a records sheet tab, cached per spreadsheet + tab.
//
// The spreadsheet id is named by the caller, like the tab name already was. The server keeps no
// copy of it: src/Data/RoutesAndSettings.ts is the single source of truth, and a mirror here
// would have to be swapped in lockstep every time development points at the test sheet.

const { MAX_SHEET_NAME_LENGTH, MAX_SHEET_ID_LENGTH, SHEET_ID_PATTERN } = require('./labels');

const CACHE_TTL_MS = 60 * 1000;
// Failures are cached too, briefly, so a bad tab requested in a loop does not become a fetch per
// request. Shorter than the success TTL so a transient outage recovers quickly.
const FAILURE_TTL_MS = 10 * 1000;

/** An error carrying the HTTP status the route should return. */
class SheetError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'SheetError';
    this.status = status;
  }
}

// "<sheetId>!<tab>" -> { rows, expires } | { promise } | { error, expires }
const cache = new Map();

// The id and the tab both vary now, so the key has to carry both: keying on the tab alone would
// serve one spreadsheet's rows for another's request for the same tab name -- exactly what
// happens when development points at the test sheet while a cached production entry is live.
// '!' cannot appear in a validated id, so the two parts can never run together ambiguously.
const cacheKey = (sheetId, sheetName) => `${sheetId}!${sheetName}`;

function assertUsableSheetName(sheetName) {
  const name = typeof sheetName === 'string' ? sheetName.trim() : '';
  if (!name) {
    throw new SheetError(400, 'sheet is required');
  }
  if (name.length > MAX_SHEET_NAME_LENGTH) {
    throw new SheetError(400, `sheet must be ${MAX_SHEET_NAME_LENGTH} characters or fewer`);
  }
  return name;
}

/**
 * The id lands in a URL path segment, so it is checked against a strict charset rather than just
 * a length: no '/', '?', '#' or '..' can reach the Sheets URL and bend it somewhere else. The
 * host stays pinned to sheets.googleapis.com, so the widest this opens things is reading some
 * other world-readable spreadsheet through our API key.
 */
function assertUsableSheetId(sheetId) {
  const id = typeof sheetId === 'string' ? sheetId.trim() : '';
  if (!id) {
    throw new SheetError(400, 'sheetId is required');
  }
  if (id.length > MAX_SHEET_ID_LENGTH) {
    throw new SheetError(400, `sheetId must be ${MAX_SHEET_ID_LENGTH} characters or fewer`);
  }
  if (!SHEET_ID_PATTERN.test(id)) {
    throw new SheetError(400, 'sheetId is not a valid spreadsheet id');
  }
  return id;
}

async function fetchRows(sheetId, sheetName) {
  const key = process.env.REACT_APP_GOOGLE_API_KEY ?? '';
  if (!key) {
    // Distinct from a Google-side failure: the process was started without the credential.
    throw new SheetError(503, 'REACT_APP_GOOGLE_API_KEY is not set');
  }

  // Built the same way as getSheetRoute in src/Data/RoutesAndSettings.ts, for consistency with
  // the client.
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${key}`;

  let response;
  try {
    response = await fetch(url); // Node 22+ has global fetch; no HTTP dependency needed.
  } catch (err) {
    throw new SheetError(503, `Sheets API unreachable: ${err.message}`);
  }

  if (!response.ok) {
    // A tab that does not exist comes back as 400 INVALID_ARGUMENT ("Unable to parse range:
    // NoSuchTab"), NOT a 404 -- so it must be translated, and kept distinct from the 400 this
    // server returns for its own malformed input.
    if (response.status === 400) {
      throw new SheetError(404, `no such sheet tab: ${sheetName}`);
    }
    if (response.status === 403) {
      // The one failure that means someone changed the API key's restrictions. It would
      // otherwise look identical to a transient outage, so say so loudly.
      console.error(
        `[certificate] Sheets API returned 403 for "${sheetName}". The API key is likely revoked ` +
          'or newly restricted (an HTTP-referrer restriction breaks all server-side requests).'
      );
      throw new SheetError(503, 'Sheets API rejected the credential');
    }
    throw new SheetError(503, `Sheets API returned ${response.status}`);
  }

  const body = await response.json();
  return Array.isArray(body.values) ? body.values : [];
}

/**
 * @param {string} sheetId the spreadsheet to read, named by the caller
 * @param {string} sheetName the tab to read, named by the caller
 * @returns {Promise<string[][]>}
 * @throws {SheetError} with `status` set to what the route should return
 */
async function getRecordRows(sheetId, sheetName) {
  const id = assertUsableSheetId(sheetId);
  const name = assertUsableSheetName(sheetName);
  const key = cacheKey(id, name);
  const now = Date.now();
  const entry = cache.get(key);

  // Store the in-flight promise, not just the value, so concurrent requests for a cold tab
  // trigger one fetch rather than one each.
  if (entry && entry.promise) return entry.promise;
  if (entry && entry.rows && entry.expires > now) return entry.rows;
  if (entry && entry.error && entry.expires > now) throw entry.error;

  const promise = (async () => {
    try {
      const rows = await fetchRows(id, name);
      cache.set(key, { rows, expires: Date.now() + CACHE_TTL_MS });
      return rows;
    } catch (err) {
      // Serve stale rows rather than failing, if we ever had any -- a refresh failure should not
      // take down a tab that was working a minute ago.
      const stale = cache.get(key);
      if (stale && stale.rows) {
        cache.set(key, { rows: stale.rows, expires: Date.now() + FAILURE_TTL_MS });
        return stale.rows;
      }
      cache.set(key, { error: err, expires: Date.now() + FAILURE_TTL_MS });
      throw err;
    }
  })();

  // Preserve any stale rows alongside the in-flight promise so the catch above can find them.
  cache.set(key, { promise, rows: entry && entry.rows });
  return promise;
}

/** Test seam. The cache also dies on every Fly machine stop (auto_stop_machines = 'stop'), so
 * the first request after a cold start always pays the fetch. */
function clearCache() {
  cache.clear();
}

module.exports = {
  getRecordRows,
  clearCache,
  SheetError,
  assertUsableSheetName,
  assertUsableSheetId,
  CACHE_TTL_MS,
  // Test-only handles, so expiry can be simulated without waiting out the TTL.
  __cacheForTests: cache,
  __cacheKeyForTests: cacheKey,
};
