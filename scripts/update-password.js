#!/usr/bin/env node

/**
 * Sets scriptsPassword in src/Data/wsoConfig.json.
 *
 * Prompts for the new password without echoing it, hashes it the same way as hashPassword in
 * src/Utils/Utils.ts (SHA-256 hex of `${password}---${display name}`, where the display name is
 * wsoDisplayName, or wsoOfficialName when there is none), and replaces only the scriptsPassword
 * value in the file, leaving the rest of its formatting as it was.
 *
 * Usage: npm run update-password
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src', 'Data', 'wsoConfig.json');
const passwordPattern = /("scriptsPassword"\s*:\s*)"[^"]*"/;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();

    let input = '';
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          resolve(input);
          return;
        }
        if (char === '\u0003') {
          finish();
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    fail('run this in a terminal; it prompts for the password.');
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const displayName = config.wsoDisplayName ?? config.wsoOfficialName;
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

  const hash = crypto.createHash('sha256').update(`${password}---${displayName}`).digest('hex');
  fs.writeFileSync(configPath, raw.replace(passwordPattern, `$1"${hash}"`));

  console.log(`Updated scriptsPassword in ${path.relative(process.cwd(), configPath)}`);
  console.log(`  Hash:         ${hash}`);
  console.log(`  Display name: ${displayName}`);
  console.log('The new password works once the app is rebuilt and deployed.');
}

main();
