#!/usr/bin/env node

/**
 * Historic Records Gathering Script
 *
 * Fetches the best lifts for every age group / weight class combination defined
 * in weightClasses2018, querying only within each weight class's own start/end
 * date window.  Outputs a CSV of all results (no comparison against current records).
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Parse a top-level string-array constant from a TypeScript source file. */
function parseStringArray(content, variableName) {
  const startIdx = content.indexOf(`export const ${variableName}`);
  if (startIdx === -1) return [];
  const bracketOpen = content.indexOf('[', startIdx);
  const bracketClose = content.indexOf(']', bracketOpen);
  if (bracketOpen === -1 || bracketClose === -1) return [];
  const inner = content.slice(bracketOpen + 1, bracketClose);
  return [...inner.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] || m[2]);
}

/** Extract the ageGroups array from a single weight-class object string. */
function parseAgeGroupsFromObj(objStr, spreadMap) {
  const agStart = objStr.indexOf('ageGroups:');
  if (agStart === -1) return [];

  const afterColon = objStr.slice(agStart + 'ageGroups:'.length).trimStart();

  // Direct variable reference: ageGroups: youthAgeGroups
  if (afterColon[0] !== '[') {
    const varMatch = afterColon.match(/^(\w+)/);
    return varMatch && spreadMap[varMatch[1]] ? [...spreadMap[varMatch[1]]] : [];
  }

  // Array literal: ageGroups: ["U11", ...defaultMensAgeGroups]
  const bracketOpen = objStr.indexOf('[', agStart);
  const bracketClose = objStr.indexOf(']', bracketOpen);
  if (bracketClose === -1) return [];
  const inner = objStr.slice(bracketOpen + 1, bracketClose);

  const result = [];
  for (const m of inner.matchAll(/"([^"]+)"|'([^']+)'/g)) result.push(m[1] || m[2]);
  for (const m of inner.matchAll(/\.\.\.(\w+)/g)) {
    if (spreadMap[m[1]]) result.push(...spreadMap[m[1]]);
  }
  return result;
}

function loadHistoricWeightClasses() {
  const filePath = path.join(__dirname, '../src/Data/historicWeightClasses.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const spreadMap = {
    defaultWomensAgeGroups: parseStringArray(content, 'defaultWomensAgeGroups'),
    defaultMensAgeGroups: parseStringArray(content, 'defaultMensAgeGroups'),
    youthAgeGroups: parseStringArray(content, 'youthAgeGroups'),
  };

  const result = [];
  const startIdx = content.indexOf('export const weightClasses2018');
  if (startIdx === -1) return result;
  const arrayStart = content.indexOf('[', startIdx);
  if (arrayStart === -1) return result;

  let depth = 0;
  let objStart = -1;
  for (let i = arrayStart + 1; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const objStr = content.slice(objStart, i + 1);
        const idMatch = objStr.match(/id:\s*'([^']+)'/);
        const sportIdMatch = objStr.match(/sport80Id:\s*(\d+)/);
        const nameMatch = objStr.match(/name:\s*"([^"]+)"/) || objStr.match(/name:\s*'([^']+)'/);
        const maxMatch = objStr.match(/maxBodyweight:\s*'([^']+)'/);
        const minMatch = objStr.match(/minBodyweight:\s*'([^']+)'/);
        const genderMatch = objStr.match(/gender:\s*'([^']+)'/);
        const startMatch = objStr.match(/start:\s*'([^']+)'/);
        const endMatch = objStr.match(/end:\s*'([^']+)'/);

        if (idMatch && sportIdMatch) {
          result.push({
            id: idMatch[1],
            name: nameMatch ? nameMatch[1] : undefined,
            sport80Id: parseInt(sportIdMatch[1]),
            minBodyweight: minMatch ? minMatch[1] : undefined,
            maxBodyweight: maxMatch ? maxMatch[1] : undefined,
            gender: genderMatch ? genderMatch[1] : undefined,
            start: startMatch ? startMatch[1] : undefined,
            end: endMatch ? endMatch[1] : undefined,
            ageGroups: parseAgeGroupsFromObj(objStr, spreadMap),
          });
        }
        objStart = -1;
      }
    }
  }
  return result;
}

function loadAgeGroups() {
  const filePath = path.join(__dirname, '../src/Data/ageGroups.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const ageGroups = [];
  const startIdx = content.indexOf('export const ageGroups');
  if (startIdx === -1) return ageGroups;
  const arrayStart = content.indexOf('[', startIdx);
  if (arrayStart === -1) return ageGroups;

  let depth = 0;
  let objStart = -1;
  for (let i = arrayStart + 1; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const objStr = content.slice(objStart, i + 1);
        const idMatch = objStr.match(/id:\s*'([^']+)'/);
        const nameMatch = objStr.match(/name:\s*'([^']+)'/);
        const minAgeMatch = objStr.match(/minimum_lifter_age:\s*'([^']+)'/);
        const maxAgeMatch = objStr.match(/maximum_lifter_age:\s*'([^']+)'/);
        if (idMatch) {
          ageGroups.push({
            id: idMatch[1],
            name: nameMatch ? nameMatch[1] : undefined,
            minimum_lifter_age: minAgeMatch ? minAgeMatch[1] : undefined,
            maximum_lifter_age: maxAgeMatch ? maxAgeMatch[1] : undefined,
          });
        }
        objStart = -1;
      }
    }
  }
  return ageGroups;
}

// ---------------------------------------------------------------------------
// ID normalisation: W35/M35 -> 35, JR / OPEN / U11 etc. unchanged
// ---------------------------------------------------------------------------
function normalizeAgeGroupId(id) {
  return /^[WM]\d+$/.test(id) ? id.slice(1) : id;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const USAW_API = 'https://admin-usaw-rankings.sport80.com/api';
const WSO_ID = 21; // California North Central

const INELIGIBLE_ATHLETES = new Set([
  'Aurora van Ulft',
  'Bekdoolot Rasulbekov',
]);

const headers = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'x-api-token': '14ced0f3-421f-4acf-94ad-cc63a371af19',
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchTopAthletes(weightClass, ageGroup, dateStart, dateEnd) {
  const body = JSON.stringify({
    columns: [],
    filters: {
      date_range_start: dateStart,
      date_range_end: dateEnd,
      weight_class: weightClass.sport80Id,
      wso: WSO_ID,
      minimum_lifter_age: ageGroup.minimum_lifter_age,
      maximum_lifter_age: ageGroup.maximum_lifter_age,
    },
  });

  try {
    const response = await fetch(
      `${USAW_API}/categories/all/rankings/table/data?platform=1&p=0&l=5&sort=action&d=asc&s=&st=`,
      { method: 'POST', headers, body },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function fetchAthleteLifts(lifterId, dateStart, dateEnd) {
  try {
    const response = await fetch(
      `${USAW_API}/athletes/${lifterId}/table/data?p=0&l=100&sort=&d=asc&s=&st=`,
      { method: 'POST', headers },
    );
    if (!response.ok) return [];
    const data = await response.json();
    const lifts = data.data || [];
    return lifts.filter(l => l.date && l.date >= dateStart && l.date <= dateEnd);
  } catch {
    return [];
  }
}

function extractBestLifts(athleteData, weightClass, ageGroup, lifter) {
  const minBw = parseFloat(weightClass.minBodyweight);
  const maxBw = parseFloat(weightClass.maxBodyweight);

  const ageAtRankingTime = parseInt(lifter.lifter_age);
  const rankingYear = new Date(lifter.lift_date).getFullYear();
  const minYear = rankingYear - (ageAtRankingTime - parseInt(ageGroup.minimum_lifter_age));
  const maxYear = rankingYear + (parseInt(ageGroup.maximum_lifter_age) - ageAtRankingTime);

  const best = { snatch: null, 'clean & jerk': null, total: null };

  for (const lift of athleteData) {
    const bw = parseFloat(String(lift['body_weight_(kg)'] ?? 0));
    const meetYear = new Date(lift.date).getFullYear();
    if (bw < minBw || bw > maxBw) continue;
    if (meetYear < minYear || meetYear > maxYear) continue;

    if (lift.best_snatch && (!best.snatch || lift.best_snatch > best.snatch.weight)) {
      best.snatch = { weight: lift.best_snatch, date: lift.date, event: lift.meet };
    }
    if (lift['best_c&j'] && (!best['clean & jerk'] || lift['best_c&j'] > best['clean & jerk'].weight)) {
      best['clean & jerk'] = { weight: lift['best_c&j'], date: lift.date, event: lift.meet };
    }
    if (lift.total && (!best.total || lift.total > best.total.weight)) {
      best.total = { weight: lift.total, date: lift.date, event: lift.meet };
    }
  }

  return best;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main gather
// ---------------------------------------------------------------------------

async function gatherHistoryRecords() {
  const weightClasses = loadHistoricWeightClasses();
  const ageGroups = loadAgeGroups();
  const ageGroupMap = Object.fromEntries(ageGroups.map(ag => [ag.id, ag]));

  console.log(`✓ Loaded ${weightClasses.length} historic weight classes`);
  console.log(`✓ Loaded ${ageGroups.length} age groups\n`);

  // Build flat list of (weightClass, ageGroup) combos
  const combos = [];
  for (const wc of weightClasses) {
    for (const rawId of wc.ageGroups) {
      const normalId = normalizeAgeGroupId(rawId);
      const ag = ageGroupMap[normalId];
      if (!ag) {
        console.warn(`  ⚠ Age group not found: ${rawId} (normalised: ${normalId})`);
        continue;
      }
      combos.push({ weightClass: wc, ageGroup: ag, rawAgeGroupId: rawId });
    }
  }

  console.log(`🔍 Analyzing ${combos.length} weight class / age group combinations...\n`);

  // Keyed by "ageGroupId|weightClassId|liftType" — keeps only the best lift per combo
  const bestByCombo = new Map();
  let processed = 0;

  for (const { weightClass, ageGroup, rawAgeGroupId } of combos) {
    processed++;
    const pct = Math.round((processed / combos.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${processed}/${combos.length} combinations...`);

    const dateStart = weightClass.start;
    const dateEnd = weightClass.end;
    if (!dateStart || !dateEnd) continue;

    try {
      const athletes = await fetchTopAthletes(weightClass, ageGroup, dateStart, dateEnd);

      for (const athlete of athletes) {
        if (!athlete.action || athlete.action.length === 0) continue;
        if (INELIGIBLE_ATHLETES.has(athlete.name)) continue;
        if (athlete.total > 550) continue;

        const actionUrl = athlete.action[0].url ?? athlete.action[0].route ?? '';
        const lifterId =
          actionUrl.split('https://usaweightlifting.sport80.com/public/rankings/member/')[1] ||
          actionUrl.split('/member/')[1];
        if (!lifterId) continue;

        const lifts = await fetchAthleteLifts(lifterId, dateStart, dateEnd);
        if (lifts.length === 0) continue;

        const best = extractBestLifts(lifts, weightClass, ageGroup, athlete);

        for (const [liftType, liftData] of Object.entries(best)) {
          if (!liftData) continue;
          const comboKey = `${rawAgeGroupId}|${weightClass.id}|${liftType}`;
          const existing = bestByCombo.get(comboKey);
          const isBetter = !existing || liftData.weight > existing.weight ||
            (liftData.weight === existing.weight && liftData.date < existing.date);
          if (isBetter) {
            bestByCombo.set(comboKey, {
              ageGroupId: rawAgeGroupId,
              gender: weightClass.gender === 'female' ? 'F' : 'M',
              ageMin: ageGroup.minimum_lifter_age,
              ageMax: ageGroup.maximum_lifter_age,
              bodyWeightMin: Math.round(parseFloat(weightClass.minBodyweight)),
              bodyWeightMax: weightClass.maxBodyweight,
              liftType,
              weight: liftData.weight,
              athlete: athlete.name || 'Unknown',
              date: liftData.date || '',
              event: liftData.event || '',
              wcIndex: weightClasses.indexOf(weightClass),
              agIndex: ageGroups.indexOf(ageGroup),
            });
          }
        }
      }

      await delay(100);
    } catch {
      // continue
    }
  }

  // Ensure every combo has a row for each lift type, even with no lifts recorded
  const LIFT_TYPES = ['snatch', 'clean & jerk', 'total'];
  for (const { weightClass, ageGroup, rawAgeGroupId } of combos) {
    for (const liftType of LIFT_TYPES) {
      const comboKey = `${rawAgeGroupId}|${weightClass.id}|${liftType}`;
      if (!bestByCombo.has(comboKey)) {
        bestByCombo.set(comboKey, {
          ageGroupId: rawAgeGroupId,
          gender: weightClass.gender === 'female' ? 'F' : 'M',
          ageMin: ageGroup.minimum_lifter_age,
          ageMax: ageGroup.maximum_lifter_age,
          bodyWeightMin: Math.round(parseFloat(weightClass.minBodyweight)),
          bodyWeightMax: weightClass.maxBodyweight,
          liftType,
          weight: '',
          athlete: '',
          date: '',
          event: '',
          wcIndex: weightClasses.indexOf(weightClass),
          agIndex: ageGroups.indexOf(ageGroup),
        });
      }
    }
  }

  const results = [...bestByCombo.values()];
  console.log(`\r✓ Gathered ${results.length} lifts across ${combos.length} combinations.   \n`);
  return results;
}

// ---------------------------------------------------------------------------
// CSV output
// ---------------------------------------------------------------------------

function csvField(value) {
  const str = String(value ?? '');
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

const LIFT_ORDER = { snatch: 0, 'clean & jerk': 1, total: 2 };
const LIFT_LABEL = { snatch: 'Snatch', 'clean & jerk': 'Clean & Jerk', total: 'Total' };

function generateCsv(results) {
  const ageKey = r => r.ageGroupId === 'OPEN' ? -1 : parseInt(r.ageMax);

  const sorted = [...results].sort((a, b) => {
    const ageDiff = ageKey(a) - ageKey(b);
    if (ageDiff !== 0) return ageDiff;
    if (a.gender !== b.gender) return a.gender < b.gender ? -1 : 1; // F before M
    const bwDiff = parseFloat(a.bodyWeightMax) - parseFloat(b.bodyWeightMax);
    if (bwDiff !== 0) return bwDiff;
    return (LIFT_ORDER[a.liftType] ?? 99) - (LIFT_ORDER[b.liftType] ?? 99);
  });

  const rows = [
    ['ageGroup', 'gender', 'ageMin', 'ageMax', 'bodyWeightMin', 'bodyWeightMax', 'lift', 'record', 'name', 'date', 'place'],
    ...sorted.map(r => [
      r.ageGroupId,
      r.gender,
      r.ageMin,
      r.ageMax,
      r.bodyWeightMin,
      parseFloat(r.bodyWeightMax) >= 999 ? '>' + r.bodyWeightMin : r.bodyWeightMax,
      LIFT_LABEL[r.liftType] || r.liftType,
      r.weight,
      r.athlete,
      r.date,
      r.event,
    ]),
  ];

  return rows.map(row => row.map(csvField).join(',')).join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  try {
    console.log('🏋️  Records Explorer - Historic Records Gathering\n');
    console.log('='.repeat(50) + '\n');

    const results = await gatherHistoryRecords();
    const csv = generateCsv(results);

    const outputPath = path.join(process.cwd(), 'historic-records.csv');
    fs.writeFileSync(outputPath, csv, 'utf-8');

    console.log(`\n📄 Report generated: ${path.relative(process.cwd(), outputPath)}`);
    console.log('✨ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main();
