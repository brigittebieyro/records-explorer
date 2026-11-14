/**
 * The scripts page password hash: SHA-256 hex of `${password}---${display name}`, the same as
 * hashPassword in src/Utils/Utils.ts. The display name is wsoDisplayName, or wsoOfficialName when
 * there is none.
 */

const crypto = require('crypto');

function displayNameOf(config) {
  return config.wsoDisplayName ?? config.wsoOfficialName;
}

function hashPassword(password, displayName) {
  return crypto.createHash('sha256').update(`${password}---${displayName}`).digest('hex');
}

module.exports = { displayNameOf, hashPassword };
