import { MeetResult } from '../Utils/types';

interface Props {
  meetResults: MeetResult[];
}

function getGender(ageCategory: string): 'male' | 'female' | null {
  const lower = ageCategory.toLowerCase();
  // Check female keywords first — "women's" contains "men's" as a substring
  if (
    lower.includes("women's") ||
    lower.includes('female') ||
    lower.includes('girl') ||
    lower.includes('woman')
  ) {
    return 'female';
  }
  if (
    lower.includes("men's") ||
    lower.includes('male') ||
    lower.includes('boy') ||
    lower.includes('man')
  ) {
    return 'male';
  }
  return null;
}

interface ParsedWeightClass {
  label: string; // e.g. "52kg", "86+kg"
  numericValue: number; // e.g. 52, 86 (used for sorting)
}

function parseWeightClass(ageCategory: string): ParsedWeightClass | null {
  const match = ageCategory.match(/(\d+(?:\.\d+)?)(\+?)kg$/i);
  if (!match) return null;
  return {
    label: `${match[1]}${match[2]}kg`,
    numericValue: parseFloat(match[1]),
  };
}

function getDisplayName(gender: 'male' | 'female', weightClassLabel: string): string {
  const prefix = gender === 'female' ? "Women's" : "Men's";
  return `${prefix} ${weightClassLabel}`;
}

interface WeightClassGroup {
  gender: 'male' | 'female';
  weightClassLabel: string;
  numericValue: number;
  results: MeetResult[];
}

function buildGroups(results: MeetResult[], gender: 'male' | 'female'): WeightClassGroup[] {
  const map = new Map<string, WeightClassGroup>();

  for (const result of results) {
    if (getGender(result.age_category) !== gender) continue;

    const parsed = parseWeightClass(result.age_category);
    if (!parsed) continue;

    if (!map.has(parsed.label)) {
      map.set(parsed.label, {
        gender,
        weightClassLabel: parsed.label,
        numericValue: parsed.numericValue,
        results: [],
      });
    }
    map.get(parsed.label)?.results.push(result);
  }

  for (const group of map.values()) {
    const best = new Map<string, MeetResult>();
    for (const result of group.results) {
      const existing = best.get(result.lifter);
      if (!existing || result.total > existing.total) best.set(result.lifter, result);
    }
    group.results = Array.from(best.values()).sort(
      (resultA, resultB) => resultB.total - resultA.total
    );
  }

  return Array.from(map.values()).sort(
    (resultA, resultB) => resultA.numericValue - resultB.numericValue
  );
}

function getUnclassified(results: MeetResult[]): MeetResult[] {
  return results.filter(
    (result) => !getGender(result.age_category) || !parseWeightClass(result.age_category)
  );
}

function WeightClassSection({ group }: { group: WeightClassGroup }) {
  return (
    <div className="all-records-weight-class-section">
      <p className="all-records-weight-class-header">
        <strong>{getDisplayName(group.gender, group.weightClassLabel)}</strong>
      </p>
      <ul className="local-meets-results-list">
        {group.results.map((result, i) => (
          <li key={`${result.lifter}-${i}`} className="local-meet-result-item">
            <div className="record-viewer-ranking" style={{ textAlign: 'center' }}>
              {i + 1}
            </div>
            <strong>{result.lifter}</strong>
            <br />
            <p className="local-meet-result-details">
              {result.best_snatch}kg Snatch &bull; {result['best_c&j']}kg Clean &amp; Jerk &bull;{' '}
              {result.total}kg Total
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LocalMeetResultsByWeightClass({ meetResults }: Props) {
  const womensGroups = buildGroups(meetResults, 'female');
  const mensGroups = buildGroups(meetResults, 'male');
  const unclassified = getUnclassified(meetResults);

  return (
    <div>
      <div className="all-records-columns">
        <div className="all-records-column">
          <h2 className="all-records-gender-header">Women</h2>
          {womensGroups.map((group) => (
            <WeightClassSection key={group.weightClassLabel} group={group} />
          ))}
          {womensGroups.length === 0 && (
            <p className="local-meets-empty">No women's results found.</p>
          )}
        </div>
        <div className="all-records-column">
          <h2 className="all-records-gender-header">Men</h2>
          {mensGroups.map((group) => (
            <WeightClassSection key={group.weightClassLabel} group={group} />
          ))}
          {mensGroups.length === 0 && <p className="local-meets-empty">No men's results found.</p>}
        </div>
      </div>

      {unclassified.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <p>
            <strong>
              <em>And More</em>
            </strong>
          </p>
          <ul className="local-meets-results-list">
            {unclassified.map((result, i) => (
              <li key={`unclassified-${i}`} className="local-meet-result-item">
                <p>
                  <strong>{result.lifter}</strong>
                </p>
                <p>
                  {result.best_snatch}kg Snatch &bull; {result['best_c&j']}kg Clean &amp; Jerk
                  &bull; {result.total}kg Total
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LocalMeetResultsByWeightClass;
