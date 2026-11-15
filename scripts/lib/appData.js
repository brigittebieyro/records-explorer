/**
 * Reads the app's weight classes, age groups and adaptive category wording from the TypeScript
 * sources in src/Data, for scripts that run under plain Node and cannot import them.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../src/Data');

/**
 * Load and parse weight classes from TypeScript source
 */
function loadWeightClasses() {
  const filePath = path.join(dataDir, 'defaultWeightClasses.ts');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseWeightClassesFromContent(content, 'defaultWeightClasses');
}

/**
 * Parse weight class objects from file content starting at the named array
 */
function parseWeightClassesFromContent(content, variableName) {
  const result = [];
  const startIdx = content.indexOf(`export const ${variableName}`);
  if (startIdx === -1) return result;
  // Search from the '=' so the [] of a type annotation (WeightClass[]) is not taken as the array.
  const eqIdx = content.indexOf('=', startIdx);
  if (eqIdx === -1) return result;
  const arrayStart = content.indexOf('[', eqIdx);
  if (arrayStart === -1) return result;

  let depth = 0;
  let objStart = -1;
  for (let i = arrayStart + 1; i < content.length; i++) {
    const ch = content[i];
    // The array's closing bracket: stop before reading into the next array in the file.
    if (ch === ']' && depth === 0) break;
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
        // start is either a quoted date or the name of a constant declared in the same file.
        const startMatch = objStr.match(/start:\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))/);
        let start = startMatch ? startMatch[1] : undefined;
        if (startMatch && startMatch[2]) {
          const constMatch = content.match(new RegExp(`^(?:export )?const ${startMatch[2]}\\s*=\\s*'([^']+)'`, 'm'));
          start = constMatch ? constMatch[1] : undefined;
        }
        if (idMatch && !start) {
          console.error(`❌ Could not read a start date for weight class ${idMatch[1]} (${variableName}).`);
          process.exit(1);
        }
        if (idMatch && sportIdMatch) {
          result.push({
            id: idMatch[1],
            name: nameMatch ? nameMatch[1] : undefined,
            sport80Id: parseInt(sportIdMatch[1]),
            maxBodyweight: maxMatch ? maxMatch[1] : undefined,
            minBodyweight: minMatch ? minMatch[1] : undefined,
            gender: genderMatch ? genderMatch[1] : undefined,
            start,
          });
        }
        objStart = -1;
      }
    }
  }
  return result;
}

/**
 * Load youth weight class arrays (u11/u13/u15/u17) and return a map
 */
function loadYouthWeightClasses() {
  const filePath = path.join(dataDir, 'youthWeightClasses.ts');
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const mapping = {};
  const mapNames = { U11: 'u11WeightClasses', U13: 'u13WeightClasses', U15: 'u15WeightClasses', U17: 'u17WeightClasses' };
  Object.entries(mapNames).forEach(([ageId, varName]) => {
    mapping[ageId] = parseWeightClassesFromContent(content, varName);
  });
  return mapping;
}

/**
 * Load age groups from TypeScript source
 */
function loadAgeGroups() {
  const filePath = path.join(dataDir, 'ageGroups.ts');
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
            customWeightClasses: /customWeightClasses:\s*true/.test(objStr),
          });
        }
        objStart = -1;
      }
    }
  }

  return ageGroups;
}

/**
 * The adaptive category keys and on-screen names, in the order of _adaptiveCategoryWording in
 * src/Data/RoutesAndSettings.ts. That order is also the order of the category flag columns in the
 * adaptive roster sheet.
 */
function loadAdaptiveCategories() {
  const content = fs.readFileSync(path.join(dataDir, 'RoutesAndSettings.ts'), 'utf-8');
  const pattern = /key:\s*'([a-z]+)',\s*displayName:\s*'([^']+)'/g;
  return [...content.matchAll(pattern)].map(([, key, displayName]) => ({ key, displayName }));
}

/** The weight classes an age group uses: its own set when it has one (common for youth only), otherwise the default set. */
function weightClassSetFor(ageGroup, defaultWeightClasses, youthWeightClassMap) {
  if (!ageGroup || !ageGroup.customWeightClasses) return defaultWeightClasses;
  const youthSet = youthWeightClassMap[ageGroup.id];
  return youthSet && youthSet.length ? youthSet : defaultWeightClasses;
}

module.exports = {
  loadWeightClasses,
  parseWeightClassesFromContent,
  loadYouthWeightClasses,
  loadAgeGroups,
  loadAdaptiveCategories,
  weightClassSetFor,
};
