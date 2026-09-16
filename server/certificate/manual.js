// Builds a certificate record out of details typed in by an operator, with no sheet behind it.

/**
 * Removes invisible control and format characters that could ruin the PDF.
 */
const stripUnprintable = (value) => {
  if (!value) { return ""; }
  try {
    return String(value).replace(/[\p{Cc}\p{Cf}]/gu, '').trim() || "";
  } catch (error) {
    return "";
  }
}

/**
 * @param {object} body the posted request body
 * @returns {{record: object}|{error: string}} a record renderCertificate and certificateFileName
 *   both accept.
 */
function buildManualRecord(body) {
  const source = body || {};

  return {
    record: {
      lifter: stripUnprintable(source.lifter),
      lift: stripUnprintable(source.lift),
      weight: stripUnprintable(source.weight),
      date: stripUnprintable(source.date),
      category: stripUnprintable(source.category),
      event: stripUnprintable(source.event),
      timeZone: source.timeZone,
    },
  };
}

module.exports = { buildManualRecord, stripUnprintable };
