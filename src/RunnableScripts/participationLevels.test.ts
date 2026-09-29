import {
  buildCombinations,
  fetchParticipationCount,
  generateCsv,
  parseMonthCount,
  participationFileName,
  ParticipationRow,
  runParticipationLevels,
} from './participationLevels';
import { ageGroups } from '../Data/ageGroups';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { maxMonthsLookback, wsoId } from '../Data/RoutesAndSettings';
import { u11WeightClasses } from '../Data/youthWeightClasses';
import { getAgeGroup, getWeightClassSet, rateLimitedFetch } from '../Utils/Utils';
import { AgeGroup, WeightClass } from '../Utils/types';

/**
 * rateLimitedFetch is mocked rather than global.fetch: the real one paces every request 100ms apart,
 * and a sweep of a few hundred combinations would then take half a minute of real time and time the
 * suite out. Everything else in Utils stays real, so the combinations and the CSV escaping under
 * test are the shipped ones.
 */
jest.mock('../Utils/Utils', () => ({
  ...jest.requireActual('../Utils/Utils'),
  rateLimitedFetch: jest.fn(),
}));

const fetchMock = rateLimitedFetch as jest.Mock;

// The eslint config bans non-null assertions, and every id used here is real.
const ageGroupOrThrow = (id: string): AgeGroup => {
  const ageGroup = getAgeGroup(id);
  if (!ageGroup) throw new Error(`Unknown age group ${id}`);
  return ageGroup;
};

const weightClassOrThrow = (set: WeightClass[], id: string): WeightClass => {
  const weightClass = set.find((candidate) => candidate.id === id);
  if (!weightClass) throw new Error(`Unknown weight class ${id}`);
  return weightClass;
};

/** How many combinations the data files describe, counted the same way the sweep walks them. */
const expectedCombinationCount = ageGroups.reduce(
  (sum, ageGroup) => sum + getWeightClassSet(ageGroup).length,
  0
);

const envelope = (total: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ data: [{ name: 'Jane Doe', total: 180 }], total }),
});

const row = (overrides: Partial<ParticipationRow> = {}): ParticipationRow => ({
  ageGroupId: 'OPEN',
  weightClassName: "Women's 49kg",
  gender: 'female',
  count: 7,
  ...overrides,
});

const postedBody = (callIndex = 0) => JSON.parse(fetchMock.mock.calls[callIndex][1].body);

describe('participationLevels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('F-12: the months field', () => {
    test('a whole number of months inside the cap is accepted', () => {
      expect(parseMonthCount('1')).toBe(1);
      expect(parseMonthCount('12')).toBe(12);
      expect(parseMonthCount(' 12 ')).toBe(12);
      expect(parseMonthCount(String(maxMonthsLookback))).toBe(maxMonthsLookback);
    });

    test('anything that is not a plain count of months is rejected', () => {
      // Zero would ask for an empty window, and every row would come back a meaningless 0.
      for (const value of ['', '   ', '0', '-1', '1.5', '1e3', '+12', 'abc', '12 months']) {
        expect(parseMonthCount(value)).toBeUndefined();
      }
    });

    test('a lookback past the cap is rejected', () => {
      expect(parseMonthCount(String(maxMonthsLookback + 1))).toBeUndefined();
    });

    test('the download is named after the window that produced it', () => {
      expect(participationFileName(12)).toBe('participation-levels-last-12-months.csv');
    });
  });

  describe('the combinations swept', () => {
    test('every age group is paired with every class in its own set', () => {
      expect(buildCombinations()).toHaveLength(expectedCombinationCount);
    });

    test('a youth age group uses its own classes, not the default ones', () => {
      // U11 and the default set share the id W49 with different sport80Ids; sending the default id
      // for a U11 query would silently count the wrong athletes.
      const u11 = buildCombinations().filter(({ ageGroup }) => ageGroup.id === 'U11');
      const u11FortyNine = u11.find(({ weightClass }) => weightClass.id === 'W49');

      expect(u11).toHaveLength(u11WeightClasses.length);
      expect(u11FortyNine?.weightClass.sport80Id).toBe(
        weightClassOrThrow(u11WeightClasses, 'W49').sport80Id
      );
      expect(u11FortyNine?.weightClass.sport80Id).not.toBe(
        weightClassOrThrow(defaultWeightClasses, 'W49').sport80Id
      );
    });

    test('both genders are covered', () => {
      const genders = new Set(buildCombinations().map(({ weightClass }) => weightClass.gender));
      expect([...genders].sort()).toEqual(['female', 'male']);
    });
  });

  describe('counting one combination', () => {
    const ageGroup = ageGroupOrThrow('OPEN');
    const weightClass = weightClassOrThrow(defaultWeightClasses, 'W49');

    test('one row is asked for, and the count comes off the envelope total', async () => {
      fetchMock.mockResolvedValue(envelope(23));

      const result = await fetchParticipationCount(
        ageGroup,
        weightClass,
        '2025-09-29',
        '2026-09-30'
      );

      expect(result).toEqual({ count: 23 });
      // Only the count is wanted, so paging through the athletes would be wasted requests.
      expect(fetchMock.mock.calls[0][0]).toContain('l=1');
    });

    test('the query is scoped to the WSO, the class and the age group', async () => {
      fetchMock.mockResolvedValue(envelope(4));

      await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30');

      expect(postedBody().filters).toEqual({
        date_range_start: '2025-09-29',
        date_range_end: '2026-09-30',
        weight_class: weightClass.sport80Id,
        wso: wsoId,
        minimum_lifter_age: ageGroup.minimum_lifter_age,
        maximum_lifter_age: ageGroup.maximum_lifter_age,
      });
    });

    test('the window is sent as asked for, even when it predates the weight class', async () => {
      fetchMock.mockResolvedValue(envelope(4));
      const before = '1999-01-01';
      expect(before < weightClass.start).toBe(true);

      await fetchParticipationCount(ageGroup, weightClass, before, '2026-09-30');

      // A class's start date governs how records read to athletes, not which rankings are fetched.
      expect(postedBody().filters.date_range_start).toBe(before);
    });

    test('a numeric string total still counts', async () => {
      fetchMock.mockResolvedValue(envelope('7'));

      expect(
        await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')
      ).toEqual({ count: 7 });
    });

    test('a genuinely empty class counts zero', async () => {
      fetchMock.mockResolvedValue(envelope(0));

      expect(
        await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')
      ).toEqual({ count: 0 });
    });

    test('a missing total is unknown rather than the one row that was asked for', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: [{ name: 'Jane Doe', total: 180 }] }),
      });

      const result = await fetchParticipationCount(
        ageGroup,
        weightClass,
        '2025-09-29',
        '2026-09-30'
      );

      expect(result.count).toBeNull();
      expect(result.reason).toBe('Response carried no numeric total.');
    });

    test('a null total is unknown', async () => {
      fetchMock.mockResolvedValue(envelope(null));

      expect(
        (await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')).count
      ).toBeNull();
    });

    test('an HTTP failure is reported, not counted', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway' });

      expect(
        await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')
      ).toEqual({ count: null, reason: 'HTTP 502: Bad Gateway' });
    });

    test('a response that is not JSON is reported', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => {
          throw new Error('Unexpected token <');
        },
      });

      expect(
        await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')
      ).toEqual({ count: null, reason: 'Response was not JSON.' });
    });

    test('a dead proxy is reported rather than thrown', async () => {
      fetchMock.mockRejectedValue(new Error('proxy down'));

      expect(
        await fetchParticipationCount(ageGroup, weightClass, '2025-09-29', '2026-09-30')
      ).toEqual({ count: null, reason: 'proxy down' });
    });
  });

  describe('F-11: the CSV', () => {
    test('one row per combination, an empty class included as a zero', () => {
      const csv = generateCsv([
        row({ count: 7 }),
        row({ weightClassName: "Women's 53kg", count: 0 }),
        row({
          ageGroupId: '35',
          weightClassName: "Men's 60kg",
          gender: 'male',
          count: 3,
        }),
      ]);

      // A masters group is named by its starting age alone, so the gender is prefixed onto it.
      expect(csv).toBe(
        'Age Group,Weight Class,Gender,Total\n' +
          "OPEN,Women's 49kg,female,7\n" +
          "OPEN,Women's 53kg,female,0\n" +
          "M35,Men's 60kg,male,3\n" +
          '\n' +
          'Stats\n' +
          'Total Medal Categories,2\n' +
          'Total Women,7\n' +
          'Total Men,3\n' +
          'OPEN,7\n' +
          '35,3\n'
      );
    });

    test('a clean run ends after the stats', () => {
      expect(generateCsv([row()])).not.toContain('Errors');
    });

    test('an uncounted combination leaves its total blank and is listed as an error', () => {
      const csv = generateCsv([
        row({ count: 0 }),
        row({ weightClassName: "Women's 53kg", count: null, reason: 'HTTP 502: Bad Gateway' }),
      ]);
      const lines = csv.trimEnd().split('\n');

      // A blank total and a zero must not read the same: one is a class nobody entered, the other
      // is a request that failed.
      expect(lines).toContain("OPEN,Women's 49kg,female,0");
      expect(lines).toContain("OPEN,Women's 53kg,female,");
      expect(lines).toContain('Errors');
      expect(lines).toContain("OPEN,Women's 53kg,female,HTTP 502: Bad Gateway");
      expect(lines.filter((line) => line.startsWith("OPEN,Women's 53kg"))).toHaveLength(2);
    });

    test('an uncounted combination is left out of the stats rather than summed as a zero', () => {
      const csv = generateCsv([
        row({ count: 4 }),
        row({ weightClassName: "Women's 53kg", count: null, reason: 'HTTP 502: Bad Gateway' }),
        row({ weightClassName: "Men's 60kg", gender: 'male', count: 6 }),
      ]);
      const lines = csv.trimEnd().split('\n');

      // Three combinations, but only the two that answered drew anyone.
      expect(lines).toContain('Total Medal Categories,2');
      expect(lines).toContain('Total Women,4');
      expect(lines).toContain('Total Men,6');
      expect(lines).toContain('OPEN,10');
    });

    test('the age group lines follow the configured order, youngest first', () => {
      const csv = generateCsv([
        row({ ageGroupId: '40', count: 1 }),
        row({ ageGroupId: 'U13', count: 2 }),
        row({ ageGroupId: 'OPEN', count: 3 }),
      ]);
      const lines = csv.trimEnd().split('\n');
      const ageGroupLines = lines.slice(lines.indexOf('Total Men,0') + 1);

      // Each line sums both genders, so a masters group is named plainly here rather than being
      // split into M40 and F40 the way the counts above are.
      expect(ageGroupLines).toEqual(['OPEN,3', 'U13,2', '40,1']);
    });

    test('an age group nobody was asked about gets no line at all', () => {
      expect(generateCsv([row({ ageGroupId: 'OPEN', count: 3 })])).not.toContain('\nJR,');
    });

    test('a masters age group carries the gender it belongs to, others stand alone', () => {
      const csv = generateCsv([
        row({ ageGroupId: '35', weightClassName: "Women's 49kg", gender: 'female', count: 1 }),
        row({ ageGroupId: '35', weightClassName: "Men's 60kg", gender: 'male', count: 2 }),
        row({ ageGroupId: 'JR', weightClassName: "Women's 49kg", gender: 'female', count: 3 }),
        row({ ageGroupId: 'U13', weightClassName: 'Girls 30kg', gender: 'female', count: 4 }),
      ]);
      const lines = csv.trimEnd().split('\n');

      // '35' alone does not say whose group it is; OPEN, JR and U13 already do.
      expect(lines).toContain("W35,Women's 49kg,female,1");
      expect(lines).toContain("M35,Men's 60kg,male,2");
      expect(lines).toContain("JR,Women's 49kg,female,3");
      expect(lines).toContain('U13,Girls 30kg,female,4');
    });
  });

  describe('the whole sweep', () => {
    test('every combination is counted and progress is reported as it goes', async () => {
      fetchMock.mockResolvedValue(envelope(5));
      const progress: Array<[number, number]> = [];

      const csv = await runParticipationLevels(3, (completed, total) =>
        progress.push([completed, total])
      );

      // Up to the blank line is the grid of counts; the stats table follows it.
      const dataRows = csv.split('\n').slice(1, csv.split('\n').indexOf(''));
      expect(dataRows).toHaveLength(expectedCombinationCount);
      expect(fetchMock).toHaveBeenCalledTimes(expectedCombinationCount);
      expect(progress).toHaveLength(expectedCombinationCount);
      expect(progress[0]).toEqual([1, expectedCombinationCount]);
      expect(progress[progress.length - 1]).toEqual([
        expectedCombinationCount,
        expectedCombinationCount,
      ]);
    });

    test('the window is the months asked for, ending tomorrow', async () => {
      fetchMock.mockResolvedValue(envelope(5));
      jest.useFakeTimers().setSystemTime(new Date('2026-09-29T12:00:00Z'));

      try {
        await runParticipationLevels(3);
      } finally {
        jest.useRealTimers();
      }

      expect(postedBody().filters.date_range_start).toBe('2026-06-29');
      expect(postedBody().filters.date_range_end).toBe('2026-09-30');
    });

    test('one failing combination does not cost the rest of the sweep', async () => {
      fetchMock.mockResolvedValue(envelope(5));
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

      const csv = await runParticipationLevels(3);
      const lines = csv.trimEnd().split('\n');
      const firstCombination = buildCombinations()[0];

      expect(fetchMock).toHaveBeenCalledTimes(expectedCombinationCount);
      expect(lines).toContain(
        `${firstCombination.ageGroup.id},${firstCombination.weightClass.name},` +
          `${firstCombination.weightClass.gender},`
      );
      expect(lines).toContain('Errors');
      expect(csv).toContain('HTTP 500: Server Error');
    });

    test('a months count the form would never submit is refused rather than swept', async () => {
      await expect(runParticipationLevels(0)).rejects.toThrow(
        `Enter a whole number of months between 1 and ${maxMonthsLookback}.`
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
