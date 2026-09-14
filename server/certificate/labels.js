// Request-shape limits for the certificate endpoint.
//
// There are deliberately no display strings here. Every word the certificate prints about the
// class comes from the client, which composes it from src/Data -- the single source of truth.
// The server used to keep a hand-maintained mirror of those strings and it went stale the first
// time the wording changed.

/** Longest tab name we will ask Google for. Guards against a malformed request becoming a fetch. */
const MAX_SHEET_NAME_LENGTH = 100;

/**
 * Longest class line we will print. The text is caller-supplied and lands in a PDF, so cap it
 * rather than letting an arbitrarily long string wrap down the page.
 */
const MAX_CATEGORY_LENGTH = 120;

module.exports = { MAX_SHEET_NAME_LENGTH, MAX_CATEGORY_LENGTH };
