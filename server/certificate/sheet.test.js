const test = require('node:test');
const assert = require('node:assert');
const {
  getRecordRows,
  clearCache,
  assertUsableSheetName,
  assertUsableSheetId,
} = require('./sheet');

// Any well-formed id; the server has no opinion about which spreadsheet this is.
const SHEET = '1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

function stubFetch(impl) {
  let calls = 0;
  global.fetch = async (...args) => {
    calls += 1;
    return impl(...args);
  };
  return () => calls;
}

const ok = (values) => ({ ok: true, status: 200, json: async () => ({ values }) });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });

test.beforeEach(() => {
  clearCache();
  process.env.REACT_APP_GOOGLE_API_KEY = 'test-key';
});

test.afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.REACT_APP_GOOGLE_API_KEY;
  else process.env.REACT_APP_GOOGLE_API_KEY = ORIGINAL_KEY;
});

// ---------------------------------------------------------------------------------------------
// Input validation -- must happen before any outbound request.
// ---------------------------------------------------------------------------------------------

test('an empty or missing tab is rejected as 400 with no outbound request', async () => {
  const calls = stubFetch(() => ok([]));
  for (const bad of ['', '   ', undefined, null, 42]) {
    await assert.rejects(() => getRecordRows(SHEET, bad), (err) => err.status === 400);
  }
  assert.strictEqual(calls(), 0, 'must not call the Sheets API for malformed input');
});

test('the tab name is trimmed before use', () => {
  assert.strictEqual(assertUsableSheetName('  Post-Aug2026  '), 'Post-Aug2026');
});

test('an empty or missing spreadsheet id is rejected as 400 with no outbound request', async () => {
  const calls = stubFetch(() => ok([]));
  for (const bad of ['', '   ', undefined, null, 42]) {
    await assert.rejects(() => getRecordRows(bad, 'Post-Aug2026'), (err) => err.status === 400);
  }
  assert.strictEqual(calls(), 0, 'must not call the Sheets API for a malformed id');
});

test('a spreadsheet id that could bend the URL is rejected as 400', async () => {
  const calls = stubFetch(() => ok([]));
  const attacks = [
    '../../../etc/passwd',
    'abc/values/Secret',
    'abc?key=stolen',
    'abc#frag',
    'abc def',
    'abc%2F..',
    'a!b', // the cache-key separator specifically
  ];
  for (const bad of attacks) {
    await assert.rejects(
      () => getRecordRows(bad, 'Post-Aug2026'),
      (err) => err.status === 400,
      `expected ${bad} to be rejected`
    );
  }
  assert.strictEqual(calls(), 0, 'no malformed id should reach the Sheets API');
});

test('the spreadsheet id is trimmed, and reaches the Sheets URL', async () => {
  let seen = '';
  stubFetch(async (url) => {
    seen = String(url);
    return ok([['row']]);
  });
  await getRecordRows(`  ${SHEET}  `, 'Post-Aug2026');
  assert.ok(
    seen.startsWith(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET}/values/Post-Aug2026?`),
    `the caller's id should be the one fetched, got ${seen}`
  );
});

// ---------------------------------------------------------------------------------------------
// Status mapping. A nonexistent tab is Google's 400 INVALID_ARGUMENT, not a 404.
// ---------------------------------------------------------------------------------------------

test('Google 400 (no such tab) surfaces as 404, not 503', async () => {
  stubFetch(() => fail(400));
  await assert.rejects(() => getRecordRows(SHEET, 'NoSuchTab'), (err) => err.status === 404);
});

test('Google 403 (key revoked or restricted) surfaces as 503', async () => {
  stubFetch(() => fail(403));
  await assert.rejects(() => getRecordRows(SHEET, 'Post-Aug2026'), (err) => err.status === 503);
});

test('Google 429 and 5xx surface as 503', async () => {
  for (const status of [429, 500, 503]) {
    clearCache();
    stubFetch(() => fail(status));
    await assert.rejects(() => getRecordRows(SHEET, 'Post-Aug2026'), (err) => err.status === 503);
  }
});

test('a network throw surfaces as 503', async () => {
  stubFetch(() => { throw new Error('ECONNREFUSED'); });
  await assert.rejects(() => getRecordRows(SHEET, 'Post-Aug2026'), (err) => err.status === 503);
});

test('a missing API key surfaces as 503 with no outbound request', async () => {
  delete process.env.REACT_APP_GOOGLE_API_KEY;
  const calls = stubFetch(() => ok([]));
  await assert.rejects(() => getRecordRows(SHEET, 'Post-Aug2026'), (err) => err.status === 503);
  assert.strictEqual(calls(), 0);
});

// ---------------------------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------------------------

test('rows are cached per tab', async () => {
  const calls = stubFetch(async (url) => ok([[String(url).includes('Adaptive_All') ? 'A' : 'P']]));
  const first = await getRecordRows(SHEET, 'Post-Aug2026');
  const again = await getRecordRows(SHEET, 'Post-Aug2026');
  assert.deepStrictEqual(first, [['P']]);
  assert.strictEqual(again, first, 'same tab should be served from cache');
  assert.strictEqual(calls(), 1);

  const other = await getRecordRows(SHEET, 'Adaptive_All');
  assert.deepStrictEqual(other, [['A']]);
  assert.strictEqual(calls(), 2, 'a different tab is a different cache entry');
});

test('the same tab in a different spreadsheet is a different cache entry', async () => {
  // The failure this guards is silent and wrong rather than loud: with the cache keyed on the tab
  // alone, pointing the site at the test sheet would keep serving production rows for 60 seconds,
  // and the certificate would print a record the page is no longer showing.
  const TEST_SHEET = '1EJgLNWI4v5KZo780RIZ6zSsaDnOinuhJHQOvZoDL8BM';
  const calls = stubFetch(async (url) => ok([[String(url).includes(TEST_SHEET) ? 'test' : 'prod']]));

  assert.deepStrictEqual(await getRecordRows(SHEET, 'Post-Aug2026'), [['prod']]);
  assert.deepStrictEqual(
    await getRecordRows(TEST_SHEET, 'Post-Aug2026'),
    [['test']],
    'the second spreadsheet must not be served the first one\'s rows'
  );
  assert.strictEqual(calls(), 2, 'each spreadsheet should have been fetched');
});

test('concurrent requests for a cold tab trigger a single fetch', async () => {
  const calls = stubFetch(async () => {
    await new Promise((r) => setTimeout(r, 10));
    return ok([['row']]);
  });
  const results = await Promise.all([
    getRecordRows(SHEET, 'Post-Aug2026'),
    getRecordRows(SHEET, 'Post-Aug2026'),
    getRecordRows(SHEET, 'Post-Aug2026'),
  ]);
  assert.strictEqual(calls(), 1, 'the in-flight promise should be shared');
  for (const r of results) assert.deepStrictEqual(r, [['row']]);
});

test('a failing refresh serves stale rows rather than erroring', async () => {
  let mode = 'ok';
  const calls = stubFetch(async () => (mode === 'ok' ? ok([['fresh']]) : fail(500)));
  const first = await getRecordRows(SHEET, 'Post-Aug2026');
  assert.deepStrictEqual(first, [['fresh']]);

  expireNow('Post-Aug2026');
  mode = 'fail';
  const second = await getRecordRows(SHEET, 'Post-Aug2026');
  assert.strictEqual(calls(), 2, 'the expired entry should have been refetched');
  assert.deepStrictEqual(second, [['fresh']], 'should fall back to the stale rows');

  // And the stale rows are kept, so the next call does not stampede either.
  const third = await getRecordRows(SHEET, 'Post-Aug2026');
  assert.deepStrictEqual(third, [['fresh']]);
  assert.strictEqual(calls(), 2);
});

test('a repeated bad tab does not become a fetch per request', async () => {
  const calls = stubFetch(() => fail(400));
  for (let i = 0; i < 3; i += 1) {
    await assert.rejects(() => getRecordRows(SHEET, 'NoSuchTab'), (err) => err.status === 404);
  }
  assert.strictEqual(calls(), 1, 'the failure should be cached briefly');
});

test('a response with no values array yields an empty row list', async () => {
  stubFetch(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  assert.deepStrictEqual(await getRecordRows(SHEET, 'Post-Aug2026'), []);
});

// Simulates TTL expiry without waiting out the 60 second cache.
function expireNow(tab, sheetId = SHEET) {
  const { __cacheForTests, __cacheKeyForTests } = require('./sheet');
  const key = __cacheKeyForTests(sheetId, tab);
  const entry = __cacheForTests.get(key);
  assert.ok(entry, `nothing cached for ${key}; the test seam is not doing anything`);
  __cacheForTests.set(key, { ...entry, expires: 0 });
}
