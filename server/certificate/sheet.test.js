const test = require('node:test');
const assert = require('node:assert');
const { getRecordRows, clearCache, assertUsableSheetName } = require('./sheet');

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
    await assert.rejects(() => getRecordRows(bad), (err) => err.status === 400);
  }
  assert.strictEqual(calls(), 0, 'must not call the Sheets API for malformed input');
});

test('an over-long tab is rejected as 400 with no outbound request', async () => {
  const calls = stubFetch(() => ok([]));
  await assert.rejects(() => getRecordRows('x'.repeat(101)), (err) => err.status === 400);
  assert.strictEqual(calls(), 0);
  // The boundary itself is allowed.
  assert.strictEqual(assertUsableSheetName('x'.repeat(100)).length, 100);
});

test('the tab name is trimmed before use', () => {
  assert.strictEqual(assertUsableSheetName('  Post-Aug2026  '), 'Post-Aug2026');
});

// ---------------------------------------------------------------------------------------------
// Status mapping. A nonexistent tab is Google's 400 INVALID_ARGUMENT, not a 404.
// ---------------------------------------------------------------------------------------------

test('Google 400 (no such tab) surfaces as 404, not 503', async () => {
  stubFetch(() => fail(400));
  await assert.rejects(() => getRecordRows('NoSuchTab'), (err) => err.status === 404);
});

test('Google 403 (key revoked or restricted) surfaces as 503', async () => {
  stubFetch(() => fail(403));
  await assert.rejects(() => getRecordRows('Post-Aug2026'), (err) => err.status === 503);
});

test('Google 429 and 5xx surface as 503', async () => {
  for (const status of [429, 500, 503]) {
    clearCache();
    stubFetch(() => fail(status));
    await assert.rejects(() => getRecordRows('Post-Aug2026'), (err) => err.status === 503);
  }
});

test('a network throw surfaces as 503', async () => {
  stubFetch(() => { throw new Error('ECONNREFUSED'); });
  await assert.rejects(() => getRecordRows('Post-Aug2026'), (err) => err.status === 503);
});

test('a missing API key surfaces as 503 with no outbound request', async () => {
  delete process.env.REACT_APP_GOOGLE_API_KEY;
  const calls = stubFetch(() => ok([]));
  await assert.rejects(() => getRecordRows('Post-Aug2026'), (err) => err.status === 503);
  assert.strictEqual(calls(), 0);
});

// ---------------------------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------------------------

test('rows are cached per tab', async () => {
  const calls = stubFetch(async (url) => ok([[String(url).includes('Adaptive_All') ? 'A' : 'P']]));
  const first = await getRecordRows('Post-Aug2026');
  const again = await getRecordRows('Post-Aug2026');
  assert.deepStrictEqual(first, [['P']]);
  assert.strictEqual(again, first, 'same tab should be served from cache');
  assert.strictEqual(calls(), 1);

  const other = await getRecordRows('Adaptive_All');
  assert.deepStrictEqual(other, [['A']]);
  assert.strictEqual(calls(), 2, 'a different tab is a different cache entry');
});

test('concurrent requests for a cold tab trigger a single fetch', async () => {
  const calls = stubFetch(async () => {
    await new Promise((r) => setTimeout(r, 10));
    return ok([['row']]);
  });
  const results = await Promise.all([
    getRecordRows('Post-Aug2026'),
    getRecordRows('Post-Aug2026'),
    getRecordRows('Post-Aug2026'),
  ]);
  assert.strictEqual(calls(), 1, 'the in-flight promise should be shared');
  for (const r of results) assert.deepStrictEqual(r, [['row']]);
});

test('a failing refresh serves stale rows rather than erroring', async () => {
  let mode = 'ok';
  const calls = stubFetch(async () => (mode === 'ok' ? ok([['fresh']]) : fail(500)));
  const first = await getRecordRows('Post-Aug2026');
  assert.deepStrictEqual(first, [['fresh']]);

  expireNow('Post-Aug2026');
  mode = 'fail';
  const second = await getRecordRows('Post-Aug2026');
  assert.strictEqual(calls(), 2, 'the expired entry should have been refetched');
  assert.deepStrictEqual(second, [['fresh']], 'should fall back to the stale rows');

  // And the stale rows are kept, so the next call does not stampede either.
  const third = await getRecordRows('Post-Aug2026');
  assert.deepStrictEqual(third, [['fresh']]);
  assert.strictEqual(calls(), 2);
});

test('a repeated bad tab does not become a fetch per request', async () => {
  const calls = stubFetch(() => fail(400));
  for (let i = 0; i < 3; i += 1) {
    await assert.rejects(() => getRecordRows('NoSuchTab'), (err) => err.status === 404);
  }
  assert.strictEqual(calls(), 1, 'the failure should be cached briefly');
});

test('a response with no values array yields an empty row list', async () => {
  stubFetch(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  assert.deepStrictEqual(await getRecordRows('Post-Aug2026'), []);
});

// Simulates TTL expiry without waiting out the 60 second cache.
function expireNow(tab) {
  const { __cacheForTests } = require('./sheet');
  const entry = __cacheForTests.get(tab);
  assert.ok(entry, `nothing cached for ${tab}; the test seam is not doing anything`);
  __cacheForTests.set(tab, { ...entry, expires: 0 });
}
