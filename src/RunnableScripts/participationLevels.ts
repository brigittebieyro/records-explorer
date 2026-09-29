import { ageGroups } from '../Data/ageGroups';
import {
  getRankingsRoute,
  getRecentMonthsDateRange,
  headers,
  wsoId,
} from '../Data/RoutesAndSettings';
import { AgeGroup, LifterRankingData, WeightClass } from '../Utils/types';
import { csvField, getWeightClassSet, rateLimitedFetch } from '../Utils/Utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The rankings envelope. Every other caller in the app reads only `data`; this script reads only
 * `total`, which is how many athletes matched the filters in all rather than on the page asked for.
 * Typed loose because it arrives untyped from the API -- readEnvelopeTotal narrows it.
 */
interface RankingsEnvelope {
  data?: LifterRankingData[];
  total?: unknown;
}

export interface ParticipationRow {
  ageGroupId: string;
  /** The class as it is named for people -- "Women's 49kg", "Girls 30kg" -- not its id. */
  weightClassName: string;
  gender: 'male' | 'female';
  /** null when the response carried no number worth trusting -- which is not the same as zero. */
  count: number | null;
  /** Why `count` is null. Listed in the CSV's errors table. */
  reason?: string;
}

/**
 * The operator's months field, as a number of months or undefined when it holds anything else.
 * Digits only, so '1.5', '-3', '1e3' and '12 months' are all rejected rather than coerced. Zero is
 * rejected too: a zero-month window is empty, and every row would come back a meaningless 0.
 */
export const parseMonthCount = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return parsed >= 1 ? parsed : undefined;
};

export const participationFileName = (monthCount: number): string =>
  `participation-levels-last-${monthCount}-months.csv`;

/**
 * Every combination the sweep covers, in the order the data files list them. Youth age groups have
 * their own weight class sets, so the pairing comes from getWeightClassSet rather than from a
 * single list of classes.
 */
export function buildCombinations(): Array<{ ageGroup: AgeGroup; weightClass: WeightClass }> {
  const combinations: Array<{ ageGroup: AgeGroup; weightClass: WeightClass }> = [];
  for (const ageGroup of ageGroups) {
    for (const weightClass of getWeightClassSet(ageGroup)) {
      combinations.push({ ageGroup, weightClass });
    }
  }
  return combinations;
}

/**
 * The match count off the envelope. A numeric string is accepted, anything else -- missing, null,
 * an object, a negative -- is not: it has to be distinguishable from a real zero.
 */
const readEnvelopeTotal = (raw: unknown): number | undefined => {
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

// ─── API fetching ─────────────────────────────────────────────────────────────

/**
 * How many athletes competed in one age group and weight class inside the window.
 *
 * Only one row is asked for: the count comes from the envelope's `total`, so paging through the
 * athletes themselves would be requests spent on data nothing here reads. `weightClass.start` is
 * deliberately not consulted -- a class's start date governs how records are presented to athletes,
 * not which rankings the API will answer for.
 *
 * Never throws. A combination that cannot be counted comes back as a null count with the reason,
 * so one failure does not cost the other few hundred.
 */
export async function fetchParticipationCount(
  ageGroup: AgeGroup,
  weightClass: WeightClass,
  windowStart: string,
  windowEnd: string
): Promise<{ count: number | null; reason?: string }> {
  const body = JSON.stringify({
    columns: [],
    filters: {
      date_range_start: windowStart,
      date_range_end: windowEnd,
      weight_class: weightClass.sport80Id,
      wso: wsoId,
      minimum_lifter_age: ageGroup.minimum_lifter_age,
      maximum_lifter_age: ageGroup.maximum_lifter_age,
    },
  });

  let response: Response;
  try {
    response = await rateLimitedFetch(getRankingsRoute(1), { method: 'POST', headers, body });
  } catch (err) {
    return { count: null, reason: err instanceof Error ? err.message : 'Request failed.' };
  }
  if (!response.ok) {
    return { count: null, reason: `HTTP ${response.status}: ${response.statusText}` };
  }

  let envelope: RankingsEnvelope;
  try {
    envelope = await response.json();
  } catch {
    return { count: null, reason: 'Response was not JSON.' };
  }

  const total = readEnvelopeTotal(envelope?.total);
  // Falling back to `data.length` would read as 1 for a class of forty, because only one row was
  // asked for. An unknown count stays unknown.
  if (total === undefined) return { count: null, reason: 'Response carried no numeric total.' };
  return { count: total };
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * How an age group is written in the output. Masters groups are identified by their starting age
 * alone ('35', '40'), which does not say who the group is for, so the gender is prefixed: M35 for
 * men, W35 for women, as the records sheets spell them. Every other group already names itself
 * (OPEN, JR, U13).
 */
const ageGroupLabel = (ageGroupId: string, gender: 'male' | 'female'): string =>
  /^\d+$/.test(ageGroupId) ? `${gender === 'female' ? 'W' : 'M'}${ageGroupId}` : ageGroupId;

/** Adds up the counts that came back, leaving the uncounted ones out of the sum entirely. */
const sumCounts = (rows: ParticipationRow[]): number =>
  rows.reduce((sum, row) => sum + (row.count ?? 0), 0);

/**
 * The summary table: how many categories drew anyone, the split by gender, and a line per age
 * group. Each is a sum over the counts above, so an uncounted combination is missing from its
 * totals rather than being read as a zero -- the errors table below names those.
 */
const statsTable = (rows: ParticipationRow[]): Array<Array<string | number>> => {
  const table: Array<Array<string | number>> = [
    ['Stats'],
    // A medal category is one combination: a weight class within an age group.
    ['Total Medal Categories', rows.filter((row) => (row.count ?? 0) > 0).length],
    ['Total Women', sumCounts(rows.filter((row) => row.gender === 'female'))],
    ['Total Men', sumCounts(rows.filter((row) => row.gender === 'male'))],
  ];

  // Walked in the order the age groups are configured rather than the order they appear in the
  // rows, so the summary reads youngest to oldest however the sweep was assembled.
  for (const ageGroup of ageGroups) {
    const groupRows = rows.filter((row) => row.ageGroupId === ageGroup.id);
    if (groupRows.length === 0) continue;
    table.push([ageGroup.id, sumCounts(groupRows)]);
  }

  return table;
};

/**
 * The counts, one row per combination -- an empty class included as a 0 rather than left out, so
 * the file is a complete grid -- followed by a stats table summarising them.
 *
 * A combination that could not be counted leaves its Total cell empty and is listed again in an
 * errors table below, the way the adaptive script reports its unresolved athletes. A blank caused
 * by a proxy hiccup must not be mistaken for a class nobody entered.
 */
export function generateCsv(rows: ParticipationRow[]): string {
  const table: Array<Array<string | number>> = [
    ['Age Group', 'Weight Class', 'Gender', 'Total'],
    ...rows.map((row) => [
      ageGroupLabel(row.ageGroupId, row.gender),
      row.weightClassName,
      row.gender,
      row.count === null ? '' : row.count,
    ]),
  ];

  table.push([]);
  table.push(...statsTable(rows));

  const unavailable = rows.filter((row) => row.count === null);
  if (unavailable.length > 0) {
    table.push([]);
    table.push(['Errors']);
    table.push(['Age Group', 'Weight Class', 'Gender', 'Error']);
    for (const row of unavailable) {
      table.push([
        ageGroupLabel(row.ageGroupId, row.gender),
        row.weightClassName,
        row.gender,
        row.reason ?? '',
      ]);
    }
  }

  return table.map((row) => row.map(csvField).join(',')).join('\n') + '\n';
}

// ─── Exported entry point ─────────────────────────────────────────────────────

/**
 * Counts participation in every age group and weight class over the last `monthCount` months.
 *
 * One request per combination, a few hundred of them, run one after another: rateLimitedFetch paces
 * them either way, but sequentially keeps `onProgress` meaningful and keeps a few hundred sockets
 * off the proxy that is also serving the page.
 */
export async function runParticipationLevels(
  monthCount: number,
  onProgress?: (completed: number, total: number) => void
): Promise<string> {
  // The form's disabled Go button is UI, not a contract.
  if (parseMonthCount(String(monthCount)) === undefined) {
    throw new Error('Enter a whole number of months, one or more.');
  }

  const { startDate, endDate } = getRecentMonthsDateRange(monthCount);
  const combinations = buildCombinations();
  const rows: ParticipationRow[] = [];

  for (const { ageGroup, weightClass } of combinations) {
    const { count, reason } = await fetchParticipationCount(
      ageGroup,
      weightClass,
      startDate,
      endDate
    );
    rows.push({
      ageGroupId: ageGroup.id,
      weightClassName: weightClass.name,
      gender: weightClass.gender,
      count,
      reason,
    });
    onProgress?.(rows.length, combinations.length);
  }

  return generateCsv(rows);
}
