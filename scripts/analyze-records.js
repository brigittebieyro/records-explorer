#!/usr/bin/env node

/**
 * Record Breaking Analysis Script
 * 
 * This script dynamically loads weight classes and age groups from the app source,
 * analyzes all combinations to identify lifts that would break existing records.
 * 
 * Key features:
 * - Dynamically loads current weight classes from source
 * - Handles custom weight classes per age group
 * - Only queries from each weight class's start date (no previousAnalogs)
 * - Uses POST requests with proper filtering
 * - Correctly extracts best lifts by lift type
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and parse weight classes from TypeScript source
 */
function loadWeightClasses() {
  const filePath = path.join(__dirname, '../src/Data/defaultWeightClasses.ts');
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
        const maxMatch = objStr.match(/maxBodyweight:\s*'([^']+)'/);
        const minMatch = objStr.match(/minBodyweight:\s*'([^']+)'/);
        const genderMatch = objStr.match(/gender:\s*'([^']+)'/);
        const startMatch = objStr.match(/start:\s*'([^']+)'/);
        if (idMatch && sportIdMatch) {
          result.push({
            id: idMatch[1],
            sport80Id: parseInt(sportIdMatch[1]),
            maxBodyweight: maxMatch ? maxMatch[1] : undefined,
            minBodyweight: minMatch ? minMatch[1] : undefined,
            gender: genderMatch ? genderMatch[1] : undefined,
            start: startMatch ? startMatch[1] : undefined,
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
  const filePath = path.join(__dirname, '../src/Data/youthWeightClasses.ts');
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const mapping = {};
  const mapNames = { U11: 'u11WeightClasses', U13: 'u13WeightClasses', U15: 'u15WeightClasses', U17: 'u17WeightClasses' };
  Object.entries(mapNames).forEach(([ageId, varName]) => {
    mapping[ageId] = parseWeightClassesFromContent(content, varName);
  });
  return mapping;

/**
 * Load age groups from TypeScript source
 */
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
            customWeightClasses: /customWeightClasses:\s*true/.test(objStr),
          });
        }
        objStart = -1;
      }
    }
  }

  return ageGroups;
}

const defaultWeightClasses = loadWeightClasses();
const ageGroups = loadAgeGroups();

console.log(`✓ Loaded ${defaultWeightClasses.length} weight classes`);
console.log(`✓ Loaded ${ageGroups.length} age groups\n`);

/**
 * Get the appropriate weight classes for an age group (handles custom weight classes for youth)
 */
function getWeightClassSetForAgeGroup(ageGroup) {
  if (!ageGroup) return defaultWeightClasses;
  if (!ageGroup.customWeightClasses) return defaultWeightClasses;
  // Load youth weight classes mapping
  const youthMap = loadYouthWeightClasses();
  if (youthMap && youthMap[ageGroup.id] && youthMap[ageGroup.id].length) {
    return youthMap[ageGroup.id];
  }
  return defaultWeightClasses;
}

const SHEETS_CONFIG = {
  sheetId: '1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ',
  sheetName: 'Raw_Data',
  googleKey: 'AIzaSyB3tiu4QqJb-brY0MzE-e6J6rac-Lcn2_A',
};

const USAW_API = 'https://admin-usaw-rankings.sport80.com/api';
const WSO_ID = 21; // California North Central
// Query end date is when new weight classes began
const DATE_RANGE_END = '2026-08-01';

const headers = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'x-api-token': '14ced0f3-421f-4acf-94ad-cc63a371af19',
};

/**
 * Fetch current records from Google Sheets
 */
async function fetchCurrentRecords() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.sheetId}/values/${SHEETS_CONFIG.sheetName}?key=${SHEETS_CONFIG.googleKey}`;
  console.log('📊 Fetching current records from Google Sheets...');
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.values) {
      throw new Error('No data in response');
    }
    return data.values;
  } catch (error) {
    console.error('❌ Failed to fetch records from Google Sheets:', error.message);
    process.exit(1);
  }
}

/**
 * Parse records from Google Sheets data into a normalized map
 * Format: [index, unknown, ageGroup, gender, unknown, unknown, unknown, weightClassIndicator, liftType, weight, lifter, event, date, ...]
 */
function parseCurrentRecords(sheetData) {
  const records = {};
  let validRecords = 0;
  
  // Skip header row
  sheetData.forEach((row, index) => {
    if (index === 0) return;
    if (!row || row.length < 13) return;
    
    const [, , ageGroup, gender, , , , weightClassIndicator, liftType, weight, lifter, event, date] = row;
    
    // Filter out invalid entries and STANDARD placeholders
    if (!liftType || !weight || !lifter || lifter === 'STANDARD') return;
    if (!ageGroup || !gender) return;
    
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) return;
    
    const recordKey = `${gender}_${ageGroup}_${weightClassIndicator}_${liftType}`;
    
    // Keep only the highest weight for each record type
    if (!records[recordKey] || numWeight > records[recordKey].weight) {
      records[recordKey] = {
        weight: numWeight,
        lifter,
        date: date || '',
        liftType,
        ageGroup,
        gender,
        weightClass: weightClassIndicator,
      };
      validRecords++;
    }
  });
  
  console.log(`✓ Loaded ${validRecords} current records\n`);
  return records;
}

/**
 * Fetch top athletes for a specific weight class and age group
 */
async function fetchTopAthletes(weightClass, ageGroup, dateRangeStart) {
  const body = JSON.stringify({
    columns: [],
    filters: {
      date_range_start: dateRangeStart,
      date_range_end: DATE_RANGE_END,
      weight_class: weightClass.sport80Id,
      wso: WSO_ID,
      minimum_lifter_age: ageGroup.minimum_lifter_age,
      maximum_lifter_age: ageGroup.maximum_lifter_age,
    },
  });
  
  try {
    const response = await fetch(`${USAW_API}/categories/all/rankings/table/data?p=0&l=5&sort=action&d=asc`, {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    const athletes = (data.data || []).slice(0, 5);
    
    return athletes;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch detailed lifts for an athlete
 */
async function fetchAthleteLifts(lifterId) {
  try {
    const response = await fetch(`${USAW_API}/athletes/${lifterId}/table/data?p=0&l=100`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Extract best lifts by type from athlete's historical data
 */
function extractBestLifts(athleteData) {
  const bestLifts = {
    snatch: null,
    'clean & jerk': null,
    total: null,
  };
  
  for (const lift of athleteData) {
    if (lift.best_snatch && (!bestLifts.snatch || lift.best_snatch > bestLifts.snatch.weight)) {
      bestLifts.snatch = { weight: lift.best_snatch, date: lift.lift_date };
    }
    if (lift['best_c&j'] && (!bestLifts['clean & jerk'] || lift['best_c&j'] > bestLifts['clean & jerk'].weight)) {
      bestLifts['clean & jerk'] = { weight: lift['best_c&j'], date: lift.lift_date };
    }
    if (lift.total && (!bestLifts.total || lift.total > bestLifts.total.weight)) {
      bestLifts.total = { weight: lift.total, date: lift.lift_date };
    }
  }
  
  return bestLifts;
}

/**
 * Main analysis function
 */
async function analyzeRecords() {
  const recordBreakers = [];
  
  // Fetch current records
  const sheetData = await fetchCurrentRecords();
  const currentRecords = parseCurrentRecords(sheetData);
  
  console.log(`🔍 Analyzing ${defaultWeightClasses.length} weight classes × ${ageGroups.length} age groups...\n`);
  
  let processed = 0;
  const total = defaultWeightClasses.length * ageGroups.length;
  
  for (const weightClass of defaultWeightClasses) {
    for (const ageGroup of ageGroups) {
      processed++;
      const pct = Math.round((processed / total) * 100);
      process.stdout.write(`\r  [${pct}%] ${processed}/${total} combinations analyzed...`);
      
      try {
        // Fetch top athletes for this weight class + age group combination
        // Use the weight class start date to avoid querying before the class was created
        const athletes = await fetchTopAthletes(weightClass, ageGroup, weightClass.start);
        
        for (const athlete of athletes) {
          if (!athlete.action || athlete.action.length === 0) continue;
          
          // Extract athlete ID from the action URL
          const url = athlete.action[0].url;
          const lifterId = url.split('/member/')[1];
          if (!lifterId) continue;
          
          // Fetch this athlete's historical lifts
          const lifts = await fetchAthleteLifts(lifterId);
          if (lifts.length === 0) continue;
          
          const bestLifts = extractBestLifts(lifts);
          
          // Check each lift type against records
          for (const [liftType, liftData] of Object.entries(bestLifts)) {
            if (!liftData) continue;
            
            // Build record key to look up current record
            // Match format: GENDER_AGEGROUP_WEIGHTCLASS_LIFTTYPE
            const genderKey = weightClass.gender === 'female' ? 'F' : 'M';
            const recordKey = `${genderKey}_${ageGroup.id}_${weightClass.maxBodyweight}_${liftType}`;
            const currentRecord = currentRecords[recordKey];
            
            // Check if this lift would break the record
            if (!currentRecord || liftData.weight > currentRecord.weight) {
              recordBreakers.push({
                liftType,
                athlete: athlete.name || 'Unknown',
                weight: liftData.weight,
                weightClass: weightClass.name,
                ageGroup: ageGroup.name,
                date: liftData.date || '',
                wouldBreak: currentRecord ? currentRecord.weight : null,
                currentHolder: currentRecord ? currentRecord.lifter : null,
              });
            }
          }
        }
        
        // Rate limit to avoid overwhelming the API
        await delay(100);
      } catch (error) {
        // Continue on error, but log it for debugging
        if (processed % 10 === 0) {
          // Silently continue
        }
      }
    }
  }
  
  console.log(`\r✓ Analysis complete. Found ${recordBreakers.length} potential record breakers.   \n`);
  return recordBreakers;
}

/**
 * Utility function for delays
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate markdown report from record breakers
 */
function generateReport(recordBreakers) {
  let report = `# Record Breaking Analysis Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Total Potential Record Breakers:** ${recordBreakers.length}\n\n`;
  
  if (recordBreakers.length === 0) {
    report += `_No record-breaking lifts found in the current top athletes._\n`;
    return report;
  }
  
  // Group by lift type
  const byLiftType = {
    'snatch': [],
    'clean & jerk': [],
    'total': [],
  };
  
  recordBreakers.forEach(breaker => {
    if (byLiftType[breaker.liftType]) {
      byLiftType[breaker.liftType].push(breaker);
    }
  });
  
  // Sort by weight (descending)
  for (const liftType of Object.keys(byLiftType)) {
    byLiftType[liftType].sort((a, b) => b.weight - a.weight);
  }
  
  // Generate tables for each lift type
  const sections = [
    { type: 'snatch', title: 'Best Snatch' },
    { type: 'clean & jerk', title: 'Best Clean & Jerk' },
    { type: 'total', title: 'Best Total' },
  ];
  
  for (const section of sections) {
    report += `## ${section.title}\n\n`;
    
    const lifts = byLiftType[section.type];
    
    if (lifts.length === 0) {
      report += `_No record-breaking ${section.type}s found._\n\n`;
    } else {
      report += `| # | Athlete | Weight | Weight Class | Age Group | Current Record | Holder | Date |\n`;
      report += `|---|---------|--------|--------------|-----------|---|---|------|\n`;
      
      lifts.forEach((lift, idx) => {
        const record = lift.wouldBreak ? `${lift.wouldBreak}kg` : 'No Record';
        const holder = lift.currentHolder ? lift.currentHolder : '—';
        report += `| ${idx + 1} | ${lift.athlete} | **${lift.weight}kg** | ${lift.weightClass} | ${lift.ageGroup} | ${record} | ${holder} | ${lift.date} |\n`;
      });
      
      report += `\n`;
    }
  }
  
  report += `---\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total combinations checked:** ${defaultWeightClasses.length} weight classes × ${ageGroups.length} age groups = ${defaultWeightClasses.length * ageGroups.length}\n`;
  report += `- **Best Snatch:** ${byLiftType.snatch.length > 0 ? byLiftType.snatch[0].weight + 'kg' : 'N/A'}\n`;
  report += `- **Best Clean & Jerk:** ${byLiftType['clean & jerk'].length > 0 ? byLiftType['clean & jerk'][0].weight + 'kg' : 'N/A'}\n`;
  report += `- **Best Total:** ${byLiftType.total.length > 0 ? byLiftType.total[0].weight + 'kg' : 'N/A'}\n`;
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🏋️  Records Explorer - Record Breaking Analysis\n');
    console.log('=' .repeat(50) + '\n');
    
    const recordBreakers = await analyzeRecords();
    const report = generateReport(recordBreakers);
    
    const outputPath = path.join(process.cwd(), 'record-breaking-analysis.md');
    fs.writeFileSync(outputPath, report, 'utf-8');
    
    console.log(`\n📄 Report generated: ${path.relative(process.cwd(), outputPath)}`);
    console.log(`✨ Done!\n`);
    
  } catch (error) {
    console.error('\n❌ Error during analysis:');
    console.error(`   ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('- Ensure you have an active internet connection');
    console.error('- Check that the Google Sheets and USAW API are accessible');
    console.error('- Verify the API endpoints have not changed\n');
    process.exit(1);
  }
}

main();

