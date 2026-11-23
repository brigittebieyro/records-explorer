#!/usr/bin/env node

/**
 * Interactive first-time setup: asks for each required setting one at a time, the records
 * spreadsheet, and whether to track adaptive records, and writes src/Data/wsoConfig.json.
 *
 * The config file is written only at the very end; quitting early makes no changes.
 *
 * Usage: npm run setup-application
 */

const fs = require('fs');
const path = require('path');
const { createPrompter, promptHidden } = require('./lib/prompts');
const { displayNameOf, hashPassword } = require('./lib/password');
const {
  buildConfig,
  checks,
  isoDateOneYearAgo,
  parseList,
} = require('./lib/setupConfig');

const projectRoot = path.join(__dirname, '..');
const configPath = path.join(projectRoot, 'src', 'Data', 'wsoConfig.json');
const relative = (file) => path.relative(process.cwd(), file) || file;

const DEFAULT_STANDARD_KEY = 'STANDARD';

let prompter;

function heading(text) {
  console.log(`\n=== ${text} ===\n`);
}

function sheetUrl(sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}

// ------------------------------------------------------------------------------------------------
// Questions
// ------------------------------------------------------------------------------------------------

async function askRequiredValues() {
  heading('About your WSO');
  console.log(
    'Each question has an example. CONFIG_README.md explains every setting in more detail.\n'
  );
  const answers = {};
  answers.wsoId = Number(
    await prompter.ask(
      "Your WSO's id number in Sport80, the system behind the USAW rankings (for example 21)",
      { validate: checks.integer }
    )
  );
  answers.wsoOfficialName = await prompter.ask(
    "Your WSO's name, spelled exactly as Sport80 spells it (for example California North Central)",
    { validate: checks.required }
  );
  answers.wsoRegions = parseList(
    await prompter.ask(
      "Your state's Sport80 region id, or several separated by commas (for example 66)",
      { validate: checks.list }
    )
  );
  answers.wsoStateNames = parseList(
    await prompter.ask(
      'Your state, or several separated by commas, written out in full (for example California)',
      { validate: checks.list }
    )
  );
  answers.includeClubNameOnCertificate = await prompter.askYesNo(
    "Print the record holder's club on certificates?"
  );
  answers.wsoInfoUSAWUrl = await prompter.ask(
    "Your WSO's page on the USA Weightlifting website (starts with https://)",
    { validate: checks.webUrl }
  );
  answers.maintainerName = await prompter.ask(
    'The name of the person to contact about the site (shown publicly)',
    { validate: checks.required }
  );
  answers.maintainerEmail = await prompter.ask(
    "That person's email address (shown publicly)",
    { validate: checks.email }
  );
  return answers;
}

/** @returns {Promise<{ sheetId, sheetName, standardKey }>} */
async function askRecordsSpreadsheet() {
  heading('Records spreadsheet');
  console.log(
    'Records Explorer reads your recognized records from a Google spreadsheet. Its id can be found in the page URL when viewing it in a browser.\n' +
    ' https://docs.google.com/spreadsheets/d/<SHEET-ID>/edit\n'
  );
  const sheetId = await prompter.ask('The spreadsheet id', { validate: checks.sheetId });
  const sheetName = await prompter.ask(
    'The name of the tab with your current records, as shown at the bottom of the spreadsheet',
    { validate: checks.required }
  );
  const standardKey = await prompter.ask(
    'The text in the lifter column that marks a record standard nobody has reached yet',
    { defaultValue: DEFAULT_STANDARD_KEY, validate: checks.required }
  );
  return { sheetId, sheetName, standardKey };
}

async function askTrackAdaptiveRecords() {
  heading('Adaptive records');
  return prompter.askYesNo('Do you want to track adaptive records?');
}

async function askPassword(displayName) {
  heading('Scripts page password');
  console.log(
    'The /scripts page does not show in the menu because it\'s just for you ' +
    'and your committee members. It will also be protected with a password of your ' +
    'choosing. Select a password now. You can update this at any time.\n'
  );
  for (; ;) {
    const password = await promptHidden('Choose a password: ');
    if (!password) {
      console.log('  The password cannot be empty.');
      continue;
    }
    const again = await promptHidden('Type it again: ');
    if (password === again) return hashPassword(password, displayName);
    console.log("  Those didn't match. Let's try again.");
  }
}

// ------------------------------------------------------------------------------------------------

async function main() {
  if (!process.stdin.isTTY) {
    console.error('Please run this in a terminal: it asks questions as it goes.');
    process.exit(1);
  }
  prompter = createPrompter(() => {
    console.log('\n\nSetup cancelled. The config file was not changed.');
    process.exit(130);
  });

  console.log(
    '\nWelcome to Records Explorer setup. This asks for the settings your site needs and writes\n' +
    `them to ${relative(configPath)}. Nothing is saved until the end. Press Ctrl+C to quit.`
  );

  if (fs.existsSync(configPath)) {
    let current = '';
    try {
      current = JSON.parse(fs.readFileSync(configPath, 'utf8')).wsoOfficialName ?? '';
    } catch {
      // An unreadable file is replaced the same way.
    }
    const replace = await prompter.askYesNo(
      `\nThere is already a config file${current ? ` for ${current}` : ''}. Setup will replace it ` +
      'when it finishes. Continue?'
    );
    if (!replace) {
      console.log('Nothing was changed.');
      prompter.close();
      return;
    }
  }

  const required = await askRequiredValues();

  const records = await askRecordsSpreadsheet();
  Object.assign(required, {
    currentRecordsSheetId: records.sheetId,
    currentRecordsSheetName: records.sheetName,
    standardKey: records.standardKey,
  });

  const trackAdaptiveRecords = await askTrackAdaptiveRecords();

  prompter.close();
  // The config the setup writes has no wsoDisplayName, so the hash uses wsoOfficialName.
  required.scriptsPassword = await askPassword(displayNameOf(required));

  // Local meets are listed from one year back.
  required.localMeetStartDate = isoDateOneYearAgo();

  const config = buildConfig(required, { trackAdaptiveRecords });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  heading('All set!');
  console.log(
    '\nSuccessful site configuration! You now have all the most basic features in place.\n' +
    'If you haven\'t already, follow instructions from the Readme ' +
    '(README.md, "Set your API credentials") to place your API tokens where the app can use them.\n'
  );
}

main().catch((error) => {
  console.error(`\nSetup stopped: ${error.message}\nThe config file was not changed.`);
  process.exit(1);
});
