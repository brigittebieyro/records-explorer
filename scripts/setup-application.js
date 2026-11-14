#!/usr/bin/env node

/**
 * Interactive first-time setup: asks for each required setting one at a time, sets up the records
 * spreadsheet (and, optionally, the adaptive records tabs), and writes src/Data/wsoConfig.json.
 *
 * Every Google Sheets change is asked first, with three answers: make the change through the
 * Google API (after the person signs in), write CSV files to import by hand instead, or don't.
 * The config file is written only at the very end; quitting earlier leaves it as it was.
 *
 * Usage: npm run setup-application
 */

const fs = require('fs');
const path = require('path');
const { createPrompter, promptHidden } = require('./lib/prompts');
const { displayNameOf, hashPassword } = require('./lib/password');
const { buildRecordRows, buildRosterRows } = require('./lib/starterRows');
const { existingCsvFiles, writeCsvTabs } = require('./lib/csv');
const { SCOPES, signIn } = require('./lib/googleAuth');
const { createSpreadsheet, addTabs, shareAnyoneWithLinkCanView } = require('./lib/sheetsApi');
const {
  ADAPTIVE_CATEGORY_KEYS,
  DEFAULT_TAB_NAMES,
  buildConfig,
  checks,
  extractSheetId,
  parseList,
} = require('./lib/setupConfig');

const projectRoot = path.join(__dirname, '..');
const configPath = path.join(projectRoot, 'src', 'Data', 'wsoConfig.json');
const csvDir = path.join(projectRoot, 'starter-sheets');
const relative = (file) => path.relative(process.cwd(), file) || file;

const DEFAULT_STANDARD_KEY = 'STANDARD';

const CHOICES = {
  google: 'google',
  csv: 'csv',
  no: 'no',
};

/** Things the person still has to do, printed in the closing summary. */
const notes = [];

let prompter;
let googleToken;

function heading(text) {
  console.log(`\n=== ${text} ===\n`);
}

function sheetUrl(sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}

// ------------------------------------------------------------------------------------------------
// Google access
// ------------------------------------------------------------------------------------------------

/** Signs in once and reuses the token for the rest of the run. */
async function getGoogleToken() {
  if (googleToken) return googleToken;
  let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.log(
      '\nTo work in your Google account, the setup needs an OAuth client ID and secret from your\n' +
        'Google Cloud project. README.md, "Setting up with npm run setup-application", explains how\n' +
        'to make them. To skip this question next time, put them in .env.local as\n' +
        'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.\n'
    );
    clientId = clientId || (await prompter.ask('OAuth client ID', { validate: checks.required }));
    clientSecret =
      clientSecret || (await prompter.ask('OAuth client secret', { validate: checks.required }));
  }
  googleToken = await signIn({
    clientId,
    clientSecret,
    scopes: [SCOPES.spreadsheets, SCOPES.driveFile],
  });
  console.log('Signed in to Google.');
  return googleToken;
}

/**
 * Asks how a spreadsheet change should be made.
 * @returns {Promise<'google' | 'csv' | 'no'>}
 */
function askSheetPermission(question, googleLabel) {
  return prompter.askChoice(question, [
    { label: googleLabel, value: CHOICES.google },
    {
      label: `No, make CSV files instead (I'll import them into Google Sheets myself)`,
      value: CHOICES.csv,
    },
    { label: 'No', value: CHOICES.no },
  ]);
}

/**
 * Writes `tabs` as CSV files, asking before replacing files from an earlier run.
 * @returns {Promise<string[]>} the files the person should import
 */
async function writeCsvFiles(tabs) {
  const existing = existingCsvFiles(csvDir, tabs);
  if (existing.length > 0) {
    console.log(`\nThese files are already in ${relative(csvDir)}/:`);
    existing.forEach((file) => console.log(`  ${path.basename(file)}`));
    const replace = await prompter.askYesNo('Replace them with new ones?');
    if (!replace) {
      console.log(
        'Keeping the existing files. If they came from a run with different answers, run the setup\n' +
          'again and choose to replace them.'
      );
      const kept = new Set(existing);
      const files = writeCsvTabs(
        csvDir,
        tabs.filter((tab) => !kept.has(path.join(csvDir, `${tab.name}.csv`)))
      );
      return [...existing, ...files];
    }
  }
  return writeCsvTabs(csvDir, tabs);
}

function printImportSteps(files, { newSpreadsheet }) {
  console.log(`\nThe CSV files are in ${relative(csvDir)}/:`);
  files.forEach((file) => console.log(`  ${path.basename(file)}`));
  console.log('\nTo add them to Google Sheets:');
  let step = 1;
  if (newSpreadsheet) {
    console.log(`  ${step++}. Make a new, blank spreadsheet: go to https://sheets.new`);
  } else {
    console.log(`  ${step++}. Open your records spreadsheet.`);
  }
  console.log(
    `  ${step++}. For each file: choose File > Import > Upload, pick the file, and choose\n` +
      '     "Insert new sheet(s)". The new tab is named after the file. Keep that name: it is the\n' +
      '     name the config uses.'
  );
  if (newSpreadsheet) {
    console.log(
      `  ${step++}. You can delete the empty "Sheet1" tab.\n` +
        `  ${step++}. Click Share, and under "General access" choose "Anyone with the link" as Viewer.\n` +
        '     The app can only read the spreadsheet when it is shared this way.'
    );
  }
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
  answers.recordTimeZone = await prompter.ask(
    'The time zone your record dates are kept in (for example America/Los_Angeles)',
    {
      defaultValue: Intl.DateTimeFormat().resolvedOptions().timeZone,
      validate: checks.required,
    }
  );
  answers.allTimeStartDate = await prompter.ask(
    'How far back all-time history searches go, as YYYY-MM-DD (for example 1998-01-01)',
    { validate: checks.isoDate }
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

/**
 * @returns {Promise<null | { sheetId, sheetName, standardKey, createdBySetup, method }>} null when
 *   the person has no spreadsheet and doesn't want one made
 */
async function setUpRecordsSpreadsheet(wsoOfficialName) {
  heading('Records spreadsheet');
  console.log(
    'Records Explorer reads your recognized records from a Google spreadsheet. If you don\'t have\n' +
      'one yet, the setup can make a starter one with the columns the app reads.\n'
  );
  const hasSpreadsheet = await prompter.askYesNo(
    'Do you already have a records spreadsheet that Records Explorer reads?'
  );
  if (hasSpreadsheet) {
    const sheetId = extractSheetId(
      await prompter.ask('Paste its link (or just the id from the link)', {
        validate: checks.sheetId,
      })
    );
    const sheetName = await prompter.ask(
      'The name of the tab with your current records, as shown at the bottom of the spreadsheet',
      { validate: checks.required }
    );
    const standardKey = await prompter.ask(
      'The text in the lifter column that marks a record standard nobody has reached yet',
      { defaultValue: DEFAULT_STANDARD_KEY, validate: checks.required }
    );
    return { sheetId, sheetName, standardKey, createdBySetup: false, method: undefined };
  }

  let method = await askSheetPermission(
    `\nMay the setup create a starter records spreadsheet in your Google account? It will have one\n` +
      `"${DEFAULT_TAB_NAMES.records}" tab with a standard of 0 for every age group, weight class and lift.`,
    'Yes, sign in to Google and create it'
  );
  if (method === CHOICES.no) return null;

  const tabs = [
    {
      name: DEFAULT_TAB_NAMES.records,
      rows: buildRecordRows({ recordName: wsoOfficialName, standardKey: DEFAULT_STANDARD_KEY }),
    },
  ];
  const result = {
    sheetName: DEFAULT_TAB_NAMES.records,
    standardKey: DEFAULT_STANDARD_KEY,
    createdBySetup: true,
  };

  if (method === CHOICES.google) {
    try {
      const token = await getGoogleToken();
      const created = await createSpreadsheet(token, `${wsoOfficialName} WSO Records`, tabs);
      console.log(`\nCreated your records spreadsheet: ${created.spreadsheetUrl}`);
      await offerToShare(token, created.spreadsheetId);
      return { ...result, sheetId: created.spreadsheetId, method };
    } catch (error) {
      console.log(`\n${error.message}`);
      const useCsv = await prompter.askYesNo('Make CSV files to import by hand instead?');
      if (!useCsv) return null;
      method = CHOICES.csv;
    }
  }

  const files = await writeCsvFiles(tabs);
  printImportSteps(files, { newSpreadsheet: true });
  console.log(
    '\nWhen the spreadsheet is ready, copy its link from the address bar. The setup will wait.'
  );
  const sheetId = extractSheetId(
    await prompter.ask('Paste the new spreadsheet\'s link (or just the id from the link)', {
      validate: checks.sheetId,
    })
  );
  return { ...result, sheetId, method };
}

async function offerToShare(token, sheetId) {
  const share = await prompter.askYesNo(
    'The app can only read the spreadsheet when it is shared as "anyone with the link can view".\n' +
      'Anyone with the link could then see it, as the site will link to it. Share it that way now?'
  );
  if (!share) {
    notes.push(
      `Share the records spreadsheet as "Anyone with the link" (Viewer): ${sheetUrl(sheetId)}`
    );
    return;
  }
  try {
    await shareAnyoneWithLinkCanView(token, sheetId);
    console.log('Shared: anyone with the link can view.');
  } catch (error) {
    console.log(error.message);
    notes.push(
      `Share the records spreadsheet as "Anyone with the link" (Viewer): ${sheetUrl(sheetId)}`
    );
  }
}

/** The adaptive part of the config, or undefined when the person doesn't want adaptive records. */
async function setUpAdaptiveRecords(records, wsoOfficialName) {
  heading('Adaptive records');
  const include = await prompter.askYesNo('Do you want to include adaptive records?');
  if (!include) return undefined;

  const hasTabs =
    !records.createdBySetup &&
    (await prompter.askYesNo(
      'Does your records spreadsheet already have the adaptive records tabs, and do you have an\n' +
        'adaptive athlete roster tab?'
    ));

  let adaptive;
  if (hasTabs) {
    adaptive = await askExistingAdaptiveTabs(records.sheetId);
  } else {
    adaptive = {
      allRecordsSheetName: DEFAULT_TAB_NAMES.adaptiveAll,
      categoryRecordsSheetNames: { ...DEFAULT_TAB_NAMES.adaptiveCategories },
      liftersListSheetId: records.sheetId,
      liftersListSheetName: DEFAULT_TAB_NAMES.adaptiveRoster,
    };
    await createAdaptiveTabs(records, wsoOfficialName);
  }

  adaptive.optInFormUrl = await prompter.ask(
    'The link to the form adaptive athletes fill in to opt in (press Enter to skip)',
    { validate: checks.optionalWebUrl }
  );
  if (!adaptive.optInFormUrl) {
    notes.push(
      'Add adaptiveOptInFormUrl to the config when you have an opt-in form (see CONFIG_README.md).'
    );
  }
  return adaptive;
}

async function askExistingAdaptiveTabs(recordsSheetId) {
  console.log('\nTab names are as shown at the bottom of the spreadsheet. Press Enter to skip one.\n');
  const allRecordsSheetName = await prompter.ask(
    'The tab with the combined adaptive records for every category'
  );
  const categoryLabels = {
    physical: 'physical disability',
    hearing: 'deaf, deafened, or hard of hearing',
    vision: 'visual impairment',
    cognitive: 'intellectual impairment',
  };
  const categoryRecordsSheetNames = {};
  for (const key of ADAPTIVE_CATEGORY_KEYS) {
    categoryRecordsSheetNames[key] = await prompter.ask(
      `The tab with the ${categoryLabels[key]} records`
    );
  }
  const liftersListSheetId = extractSheetId(
    await prompter.ask(
      'The link (or id) of the spreadsheet with the adaptive athlete roster. Press Enter if it is\n' +
        'the records spreadsheet',
      { defaultValue: recordsSheetId, validate: checks.sheetId }
    )
  );
  const liftersListSheetName = await prompter.ask('The roster tab');
  return {
    allRecordsSheetName,
    categoryRecordsSheetNames,
    liftersListSheetId,
    liftersListSheetName,
  };
}

/**
 * Makes the adaptive tabs in the records spreadsheet, the same way the records spreadsheet was
 * made when the setup made it, and otherwise with the person's permission.
 */
async function createAdaptiveTabs(records, wsoOfficialName) {
  const recordRows = buildRecordRows({
    recordName: wsoOfficialName,
    standardKey: records.standardKey,
  });
  const tabs = [
    { name: DEFAULT_TAB_NAMES.adaptiveAll, rows: recordRows },
    ...ADAPTIVE_CATEGORY_KEYS.map((key) => ({
      name: DEFAULT_TAB_NAMES.adaptiveCategories[key],
      rows: recordRows,
    })),
    { name: DEFAULT_TAB_NAMES.adaptiveRoster, rows: buildRosterRows() },
  ];
  const tabNames = tabs.map((tab) => tab.name);

  let method = records.method;
  if (!records.createdBySetup) {
    method = await askSheetPermission(
      `\nMay the setup add these tabs to your records spreadsheet?\n  ${tabNames.join(', ')}\n` +
        'The records tabs start with a standard of 0 everywhere; the roster tab has only its\n' +
        'header row. Tabs you already have are not changed.',
      'Yes, sign in to Google and add them'
    );
  }

  if (method === CHOICES.google) {
    try {
      const token = await getGoogleToken();
      const { added, skipped } = await addTabs(token, records.sheetId, tabs);
      if (added.length > 0) console.log(`\nAdded tabs: ${added.join(', ')}`);
      if (skipped.length > 0) {
        console.log(`Left these tabs as they were, since they already exist: ${skipped.join(', ')}`);
      }
      return;
    } catch (error) {
      console.log(`\n${error.message}`);
      const useCsv = await prompter.askYesNo('Make CSV files to import by hand instead?');
      method = useCsv ? CHOICES.csv : CHOICES.no;
    }
  }

  if (method === CHOICES.csv) {
    const files = await writeCsvFiles(tabs);
    printImportSteps(files, { newSpreadsheet: false });
    notes.push(
      `Import the adaptive CSV files from ${relative(csvDir)}/ into your records spreadsheet, ` +
        'keeping each tab named after its file.'
    );
    return;
  }

  notes.push(
    'Adaptive records are set up only partway. The config names these tabs, which your records ' +
      `spreadsheet still needs: ${tabNames.join(', ')}. Run the setup again to have them made, or ` +
      'add them yourself: the records tabs use the same columns as your current records tab.'
  );
}

async function askPassword(displayName) {
  heading('Scripts page password');
  console.log(
    'The /scripts page runs record updates and is locked with a password. Only a scrambled copy\n' +
      '(a hash) is stored in the config. Typing is not shown.\n'
  );
  for (;;) {
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

  const records = await setUpRecordsSpreadsheet(required.wsoOfficialName);
  if (!records) {
    console.log(
      '\nRecords Explorer needs a records spreadsheet to show records, so setup has stopped here.\n' +
        'When you have one, or are ready for the setup to make one, please run\n' +
        '`npm run setup-application` again. The config file was not changed.'
    );
    prompter.close();
    return;
  }
  Object.assign(required, {
    currentRecordsSheetId: records.sheetId,
    currentRecordsSheetName: records.sheetName,
    standardKey: records.standardKey,
  });

  const adaptive = await setUpAdaptiveRecords(records, required.wsoOfficialName);

  prompter.close();
  // The config the setup writes has no wsoDisplayName, so the hash uses wsoOfficialName.
  required.scriptsPassword = await askPassword(displayNameOf(required));

  const config = buildConfig(required, adaptive);
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  heading('Done');
  console.log(`Saved your settings to ${relative(configPath)}.`);
  console.log(`Records spreadsheet: ${sheetUrl(records.sheetId)}`);
  if (notes.length > 0) {
    console.log('\nStill to do:');
    notes.forEach((note) => console.log(`  - ${note}`));
  }
  console.log(
    '\nNext steps:\n' +
      '  - Put your Google API key and Sport80 token in .env.local (README.md, "Set your API credentials").\n' +
      '  - Replace the logo images (CONFIG_README.md, "Certificates").\n' +
      '  - Optional settings, such as a display name or your website links, are in CONFIG_README.md.\n' +
      '  - Start the site with: npm run whole-application'
  );
}

main().catch((error) => {
  console.error(`\nSetup stopped: ${error.message}\nThe config file was not changed.`);
  process.exit(1);
});
