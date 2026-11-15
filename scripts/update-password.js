#!/usr/bin/env node

/**
 * Sets scriptsPassword in src/Data/wsoConfig.json.
 *
 * Prompts for the new password without echoing it, hashes it with scripts/lib/password.js (the same
 * hash as hashPassword in src/Utils/Utils.ts), and replaces only the scriptsPassword
 * value in the file, leaving the rest of its formatting as it was.
 *
 * Usage: npm run update-password
 */

const fs = require('fs');
const path = require('path');
const { promptHidden } = require('./lib/prompts');
const { displayNameOf, hashPassword } = require('./lib/password');

const configPath = path.join(__dirname, '..', 'src', 'Data', 'wsoConfig.json');
const passwordPattern = /("scriptsPassword"\s*:\s*)"[^"]*"/;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  if (!process.stdin.isTTY) {
    fail('run this in a terminal; it prompts for the password.');
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const displayName = displayNameOf(config);
  if (!displayName) {
    fail(`set wsoOfficialName (or wsoDisplayName) in ${configPath} first; the hash includes it.`);
  }
  if (!passwordPattern.test(raw)) {
    fail(`no "scriptsPassword" field found in ${configPath}.`);
  }

  const password = await promptHidden('New scripts page password: ');
  if (!password) {
    fail('the password is empty; nothing was changed.');
  }

  const hash = hashPassword(password, displayName);
  fs.writeFileSync(configPath, raw.replace(passwordPattern, `$1"${hash}"`));

  console.log(`Updated scriptsPassword in ${path.relative(process.cwd(), configPath)}`);
  console.log(`  Hash:         ${hash}`);
  console.log(`  Display name: ${displayName}`);
  console.log('The new password works once the app is rebuilt and deployed.');
}

main();
