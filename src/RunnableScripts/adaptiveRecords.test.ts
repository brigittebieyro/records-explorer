import {
  classSearchOrder,
  collectRecordBreakers,
  eligibleAgeGroups,
  fetchLifterResults,
  findWeightClass,
  generateCsv,
  parseAdaptiveRecords,
  parseAdaptiveRoster,
  parseSheetDate,
  resolveLifter,
} from './adaptiveRecords';
import { u17WeightClasses } from '../Data/youthWeightClasses';
import { getAgeGroup } from '../Utils/Utils';
import { AgeGroup, MeetRecord } from '../Utils/types';

// The eslint config bans non-null assertions, and every id used here is a real age group.
const ageGroupOrThrow = (id: string): AgeGroup => {
  const ageGroup = getAgeGroup(id);
  if (!ageGroup) throw new Error(`Unknown age group ${id}`);
  return ageGroup;
};

const rosterHeader = [
  'Lifter Name',
  'USAW Number',
  'Start Date',
  'End Date',
  'Physical Disability',
  'Deaf, Deafened, or Hard of Hearing',
  'Visual Impairment',
  'Intellectual Impairment',
];

// A record sheet row: federation, recordName, ageGroup, gender, ageMin, ageMax,
// bodyWeightMin, bodyWeightMax, lift, record, name, date, place.
const recordRow = (
  ageGroup: string,
  gender: string,
  min: string,
  max: string,
  lift: string,
  record: string,
  holder: string
): string[] => [
  'Norcal',
  'California North Central',
  ageGroup,
  gender,
  '0',
  '1000',
  min,
  max,
  lift,
  record,
  holder,
  '',
  '',
];

const recordSheetHeader = [
  'federation',
  'recordName',
  'ageGroup',
  'gender',
  'ageMin',
  'ageMax',
  'bodyWeightMin',
  'bodyWeightMax',
  'lift',
  'record',
  'name',
  'date',
  'place',
];

const resolvedLifter = {
  name: 'Jane Smith',
  usawNumber: '1013597',
  startDate: '2020-01-15',
  endDate: '',
  categorySheetNames: ['Adaptive_Vision', 'Adaptive_Cognitive'],
  lifterId: '56984',
  birthYear: 1990,
  gender: 'F',
};

const meetResult = (overrides: Partial<MeetRecord> = {}): MeetRecord => ({
  meet: 'Money In The Bank 2026',
  date: '2026-08-09',
  'body_weight_(kg)': 72.5,
  best_snatch: 70,
  'best_c&j': 90,
  total: 160,
  ...overrides,
});

describe('parseSheetDate', () => {
  test('converts the M/D/YYYY the Google Form writes into ISO', () => {
    expect(parseSheetDate('1/15/2020')).toBe('2020-01-15');
    expect(parseSheetDate('6/22/2021')).toBe('2021-06-22');
    expect(parseSheetDate('12/3/2024')).toBe('2024-12-03');
  });

  test('leaves an ISO date alone and returns empty for junk', () => {
    expect(parseSheetDate('2020-01-15')).toBe('2020-01-15');
    expect(parseSheetDate('')).toBe('');
    expect(parseSheetDate('not a date')).toBe('');
  });
});

describe('parseAdaptiveRoster', () => {
  test('reads the roster and maps the flag columns onto the category sheets in order', () => {
    const roster = parseAdaptiveRoster([
      rosterHeader,
      ['Jane Smith', '1013597', '1/15/2020', '12/31/2026', 'FALSE', 'FALSE', 'TRUE', 'TRUE'],
      ['Jane B. Smith', '1022461', '6/22/2021', '', 'TRUE', 'FALSE', 'FALSE', 'FALSE'],
    ]);

    expect(roster).toHaveLength(2);
    expect(roster[0]).toEqual({
      name: 'Jane Smith',
      usawNumber: '1013597',
      startDate: '2020-01-15',
      endDate: '2026-12-31',
      categorySheetNames: ['Adaptive_Vision', 'Adaptive_Cognitive'],
    });
    expect(roster[1].categorySheetNames).toEqual(['Adaptive_Physical']);
  });

  test('a blank end date reads as empty', () => {
    const roster = parseAdaptiveRoster([
      rosterHeader,
      ['Jane B. Smith', '1022461', '6/22/2021', '', 'TRUE', 'FALSE', 'FALSE', 'FALSE'],
    ]);

    expect(roster[0].endDate).toBe('');
  });

  test('locates columns by header text, so an inserted column does not shift the flags', () => {
    const roster = parseAdaptiveRoster([
      ['Preferred email', ...rosterHeader],
      [
        'lifter@example.com',
        'Jane Smith',
        '1013597',
        '1/15/2020',
        '12/31/2026',
        'FALSE',
        'FALSE',
        'TRUE',
        'TRUE',
      ],
    ]);

    expect(roster[0].name).toBe('Jane Smith');
    expect(roster[0].usawNumber).toBe('1013597');
    expect(roster[0].endDate).toBe('2026-12-31');
    expect(roster[0].categorySheetNames).toEqual(['Adaptive_Vision', 'Adaptive_Cognitive']);
  });

  test('skips the blank filler rows that follow the real entries', () => {
    const roster = parseAdaptiveRoster([
      rosterHeader,
      ['Jane Smith', '1013597', '1/15/2020', '', 'FALSE', 'FALSE', 'TRUE', 'TRUE'],
      ['', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE'],
      ['', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE'],
    ]);

    expect(roster).toHaveLength(1);
  });
});

describe('parseAdaptiveRecords', () => {
  test('indexes by age group, gender and lift, normalizing gendered masters labels', () => {
    const index = parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('W50', 'F', '69', '77', 'Snatch', '60', 'Jane B. Smith'),
    ]);

    expect(index['50_F_Snatch']).toEqual([
      {
        bodyWeightMin: 69,
        bodyWeightMax: 77,
        bodyWeightMaxIsOpen: false,
        weight: 60,
        holder: 'Jane B. Smith',
        ageGroupLabel: 'W50',
      },
    ]);
  });

  test("treats a '>86' top class as open-ended", () => {
    const index = parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('Open', 'F', '86', '>86', 'Total', '0', 'STANDARD'),
    ]);

    expect(index['OPEN_F_Total'][0].bodyWeightMaxIsOpen).toBe(true);
    expect(index['OPEN_F_Total'][0].bodyWeightMax).toBe(86);
  });
});

describe('eligibleAgeGroups', () => {
  test('a 17 year old is eligible for U17, Junior and Open', () => {
    expect(eligibleAgeGroups(17).map((group) => group.id)).toEqual(['OPEN', 'U17', 'JR']);
  });

  test('band boundaries are inclusive on both ends', () => {
    expect(eligibleAgeGroups(35).map((group) => group.id)).toContain('35');
    expect(eligibleAgeGroups(39).map((group) => group.id)).toContain('35');
    expect(eligibleAgeGroups(40).map((group) => group.id)).not.toContain('35');
    expect(eligibleAgeGroups(34).map((group) => group.id)).not.toContain('35');
  });
});

describe('findWeightClass', () => {
  test('picks the adult class containing the bodyweight', () => {
    const matched = findWeightClass(ageGroupOrThrow('OPEN'), 72.5, 'F');
    expect(matched?.weightClass.name).toBe("Women's 77kg");
  });

  test('the same bodyweight lands in a different class for a man', () => {
    // 72.5kg is both a Women's 77kg and a Men's 75kg bodyweight, so gender has to narrow
    // the set before matching or whichever class is listed first would always win.
    expect(findWeightClass(ageGroupOrThrow('OPEN'), 72.5, 'M')?.weightClass.name).toBe(
      "Men's 75kg"
    );
  });

  test('uses the youth set for a youth age group', () => {
    const matched = findWeightClass(ageGroupOrThrow('U11'), 35, 'F');
    expect(matched?.weightClass.name).toBe('Girls 37kg');
  });

  test('places a heavy lifter in the open-ended top class', () => {
    expect(findWeightClass(ageGroupOrThrow('OPEN'), 140, 'M')?.weightClass.name).toBe(
      "Men's 110+kg"
    );
    expect(findWeightClass(ageGroupOrThrow('OPEN'), 95, 'F')?.weightClass.name).toBe(
      "Women's 86+kg"
    );
  });
});

describe('classSearchOrder', () => {
  test('starts at the heaviest classes, alternating men and women', () => {
    const order = classSearchOrder().map((weightClass) => weightClass.name);

    expect(order.slice(0, 4)).toEqual([
      "Men's 110+kg",
      "Women's 86+kg",
      "Men's 110kg",
      "Women's 86kg",
    ]);
  });

  test('ends at the lightest class of each gender', () => {
    const order = classSearchOrder().map((weightClass) => weightClass.name);

    expect(order.slice(-2)).toEqual(["Men's 60kg", "Women's 49kg"]);
  });

  test('searches every adult class exactly once', () => {
    const order = classSearchOrder();

    expect(order).toHaveLength(16);
    expect(new Set(order).size).toBe(16);
  });

  test('never searches youth classes, since youth appear in the lightest adult class', () => {
    const youthNames = new Set(u17WeightClasses.map((weightClass) => weightClass.name));

    expect(classSearchOrder().some((wc) => youthNames.has(wc.name))).toBe(false);
  });
});

describe('resolveLifter', () => {
  // Requests are paced to ten a second, which would be real seconds of waiting across a
  // sweep, so let the pacing resolve instantly here while recording what it asked for.
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  const originalDateNow = Date.now;
  let requestedWaits: number[] = [];

  beforeEach(() => {
    requestedWaits = [];
    // rateLimitedFetch measures each slot against Date.now(), so the clock has to be held still
    // as well as the timer: a single real millisecond elapsing mid-sweep shortens that slot's
    // wait to 99, and the gaps stop being the round numbers the pacing assertion reads. Eight
    // iterations fit inside one millisecond on a fast machine and do not on a loaded one, which
    // is the difference between passing here and failing on CI.
    const frozen = originalDateNow();
    Date.now = () => frozen;
    global.setTimeout = ((callback: () => void, ms?: number) => {
      requestedWaits.push(ms ?? 0);
      callback();
      return 0;
    }) as unknown as typeof global.setTimeout;
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    global.fetch = originalFetch;
    Date.now = originalDateNow;
  });

  const rankingRow = (membership: string, memberId: string, overrides = {}) => ({
    name: 'Jane Smith',
    membership,
    gender: 'F',
    lifter_age: '36',
    lift_date: '2026-08-09',
    total: 160,
    action: [{ url: `https://usaweightlifting.sport80.com/public/rankings/member/${memberId}` }],
    ...overrides,
  });

  const rosterEntry = {
    name: 'Jane Smith',
    usawNumber: '1013597',
    startDate: '2020-01-15',
    endDate: '',
    categorySheetNames: [],
  };

  const mockRankings = (...responses: object[][]) => {
    const fetchMock = jest.fn();
    responses.forEach((rows) => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: rows }) });
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

  test('picks the row whose membership matches, not merely the name', async () => {
    // A name search returns everyone matching the string — 'Fernandes' returns three
    // different lifters — so the membership number is what identifies the athlete.
    mockRankings([
      rankingRow('9999999', '11111', { name: 'Jane Smith' }),
      rankingRow('1013597', '56984'),
    ]);

    const resolved = await resolveLifter(rosterEntry);

    expect(resolved?.lifterId).toBe('56984');
  });

  test('derives the birth year from lifter_age and lift_date', async () => {
    mockRankings([rankingRow('1013597', '56984', { lifter_age: '36', lift_date: '2026-08-09' })]);

    const resolved = await resolveLifter(rosterEntry);

    expect(resolved?.birthYear).toBe(1990);
  });

  test("searches Men's 110+kg first", async () => {
    const fetchMock = mockRankings([rankingRow('1013597', '56984')]);

    await resolveLifter(rosterEntry);

    // Men's 110+kg is sport80Id 941.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).filters.weight_class).toBe(941);
  });

  test('takes the gender from the class the athlete is found in', async () => {
    // The second class searched is Women's 86+kg.
    mockRankings([], [rankingRow('1013597', '56984', { gender: undefined })]);

    expect((await resolveLifter(rosterEntry))?.gender).toBe('F');
  });

  test('keeps sweeping down through the classes until the athlete is found', async () => {
    const fetchMock = mockRankings([], [], [rankingRow('1013597', '56984')]);

    const resolved = await resolveLifter(rosterEntry);

    expect(resolved?.lifterId).toBe('56984');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('returns undefined when the athlete is never found', async () => {
    mockRankings();

    expect(await resolveLifter(rosterEntry)).toBeUndefined();
  });

  test('paces requests to no more than ten a second', async () => {
    mockRankings();

    // A full sweep: sixteen classes, so sixteen requests.
    await resolveLifter(rosterEntry);

    // The stubbed clock never advances, so each successive request has to wait a further
    // 100ms for its slot. A gap of exactly 100ms between consecutive slots is the ceiling
    // of ten per second.
    expect(requestedWaits.length).toBeGreaterThanOrEqual(15);
    const gaps = requestedWaits.slice(1).map((wait, index) => wait - requestedWaits[index]);
    expect(gaps.every((gap) => gap === 100)).toBe(true);
  });
});

describe('fetchLifterResults', () => {
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    // Let the request pacing resolve instantly.
    global.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof global.setTimeout;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          meetResult({ date: '2026-08-09' }),
          meetResult({ date: '2026-09-01' }),
          meetResult({ date: '2026-09-02' }),
        ],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    global.fetch = originalFetch;
  });

  test('drops results after the end date and keeps one on it', async () => {
    const results = await fetchLifterResults('56984', '2020-01-15', '2026-09-01');

    expect(results.map((result) => result.date)).toEqual(['2026-08-09', '2026-09-01']);
  });

  test('keeps every result when there is no end date', async () => {
    const results = await fetchLifterResults('56984', '2020-01-15', '');

    expect(results).toHaveLength(3);
  });
});

describe('collectRecordBreakers', () => {
  const recordIndex = {
    Adaptive_All: parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
      recordRow('Open', 'F', '69', '77', 'Clean & Jerk', '0', 'STANDARD'),
      recordRow('Open', 'F', '69', '77', 'Total', '0', 'STANDARD'),
    ]),
    Adaptive_Vision: parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('Open', 'F', '69', '77', 'Snatch', '65', 'Jane B. Smith'),
    ]),
    Adaptive_Cognitive: parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
    ]),
    Adaptive_Physical: parseAdaptiveRecords([
      recordSheetHeader,
      recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
    ]),
  };

  test('emits a row in every category the athlete is flagged for, plus Adaptive_All', () => {
    const breakers = collectRecordBreakers(resolvedLifter, [meetResult()], recordIndex);
    const snatchCategories = breakers
      .filter((breaker) => breaker.lift === 'Snatch')
      .map((breaker) => breaker.category)
      .sort();

    expect(snatchCategories).toEqual(['Adaptive_All', 'Adaptive_Cognitive', 'Adaptive_Vision']);
    // Not flagged for Physical, so it never appears.
    expect(breakers.some((breaker) => breaker.category === 'Adaptive_Physical')).toBe(false);
  });

  test('carries the beaten record and its holder onto the row', () => {
    const breakers = collectRecordBreakers(resolvedLifter, [meetResult()], recordIndex);
    const visionSnatch = breakers.find((breaker) => breaker.category === 'Adaptive_Vision');

    expect(visionSnatch).toMatchObject({
      weight: 70,
      previousRecord: 65,
      previousHolder: 'Jane B. Smith',
      weightClassName: "Women's 77kg",
      ageGroupLabel: 'Open',
      usawNumber: '1013597',
      event: 'Money In The Bank 2026',
    });
  });

  test('does not emit a lift that only matches the standing record', () => {
    const breakers = collectRecordBreakers(
      resolvedLifter,
      [meetResult({ best_snatch: 65 })],
      recordIndex
    );

    expect(breakers.some((breaker) => breaker.category === 'Adaptive_Vision')).toBe(false);
  });

  test('keeps only the best result per slot across several meets', () => {
    const breakers = collectRecordBreakers(
      resolvedLifter,
      [
        meetResult({ date: '2026-03-05', best_snatch: 66 }),
        meetResult({ date: '2026-08-09', best_snatch: 71 }),
        meetResult({ date: '2026-06-05', best_snatch: 68 }),
      ],
      recordIndex
    );
    const visionSnatches = breakers.filter((breaker) => breaker.category === 'Adaptive_Vision');

    expect(visionSnatches).toHaveLength(1);
    expect(visionSnatches[0].weight).toBe(71);
    expect(visionSnatches[0].date).toBe('2026-08-09');
  });

  test('on a tie the earlier lift stands', () => {
    const breakers = collectRecordBreakers(
      resolvedLifter,
      [
        meetResult({ date: '2026-08-09', best_snatch: 70 }),
        meetResult({ date: '2026-03-05', best_snatch: 70 }),
      ],
      recordIndex
    );
    const visionSnatch = breakers.find((breaker) => breaker.category === 'Adaptive_Vision');

    expect(visionSnatch?.date).toBe('2026-03-05');
  });

  test('sporting age comes from the birth year, so an athlete is checked in each eligible group', () => {
    const youngLifter = { ...resolvedLifter, birthYear: 2009, categorySheetNames: [] };
    const index = {
      Adaptive_All: parseAdaptiveRecords([
        recordSheetHeader,
        recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
        recordRow('JR', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
        recordRow('U17', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
      ]),
    };

    // 2026 − 2009 = 17, so U17, Junior and Open all apply.
    const breakers = collectRecordBreakers(youngLifter, [meetResult()], index);

    expect(breakers.map((breaker) => breaker.ageGroupLabel).sort()).toEqual(['JR', 'Open', 'U17']);
  });
});

describe('generateCsv', () => {
  test('writes the agreed header and appends the previous-record columns', () => {
    const csv = generateCsv(
      collectRecordBreakers(
        { ...resolvedLifter, categorySheetNames: ['Adaptive_Vision'] },
        [meetResult()],
        {
          Adaptive_Vision: parseAdaptiveRecords([
            recordSheetHeader,
            recordRow('Open', 'F', '69', '77', 'Snatch', '65', 'Jane B. Smith'),
          ]),
        }
      )
    );
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe(
      'AdaptiveCategory,Weight Class,Age Group,Bodyweight,Lift,Record,Lifter Name,Date,Event Name,USAW Number,Previous Record,Previous Holder'
    );
    expect(lines[1]).toBe(
      "Adaptive_Vision,Women's 77kg,Open,72.5,Snatch,70,Jane Smith,2026-08-09,Money In The Bank 2026,1013597,65,Jane B. Smith"
    );
  });

  test('quotes an event name containing a comma', () => {
    const csv = generateCsv(
      collectRecordBreakers(
        { ...resolvedLifter, categorySheetNames: [] },
        [meetResult({ meet: '2026 Virus Weightlifting Finals, Powered by Rogue Fitness' })],
        {
          Adaptive_All: parseAdaptiveRecords([
            recordSheetHeader,
            recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
          ]),
        }
      )
    );

    expect(csv).toContain('"2026 Virus Weightlifting Finals, Powered by Rogue Fitness"');
  });

  test('an empty run still produces the header', () => {
    expect(generateCsv([])).toBe(
      'AdaptiveCategory,Weight Class,Age Group,Bodyweight,Lift,Record,Lifter Name,Date,Event Name,USAW Number,Previous Record,Previous Holder\n'
    );
  });

  test('an athlete who cannot be found in the rankings gets an errors table below', () => {
    const csv = generateCsv(
      [],
      [
        {
          name: 'Jane B. Smith',
          usawNumber: '9999999',
          startDate: '2024-01-01',
          endDate: '',
          categorySheetNames: [],
        },
      ]
    );
    const lines = csv.trim().split('\n');

    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('Errors');
    expect(lines[3]).toBe('Lifter Name,USAW Number,Error');
    expect(lines[4]).toBe(
      'Jane B. Smith,9999999,Not found in the USAW rankings. Check the name and USAW number on the roster sheet.'
    );
  });

  test('the errors table sits below the records, not among them', () => {
    const csv = generateCsv(
      collectRecordBreakers({ ...resolvedLifter, categorySheetNames: [] }, [meetResult()], {
        Adaptive_All: parseAdaptiveRecords([
          recordSheetHeader,
          recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
        ]),
      }),
      [
        {
          name: 'Jane B. Smith',
          usawNumber: '9999999',
          startDate: '2024-01-01',
          endDate: '',
          categorySheetNames: [],
        },
      ]
    );
    const lines = csv.trim().split('\n');

    expect(lines[1]).toContain('Adaptive_All');
    expect(lines.indexOf('Errors')).toBeGreaterThan(1);
    // Every record row comes before the blank separator.
    expect(lines.slice(1, lines.indexOf('')).every((line) => line.startsWith('Adaptive_'))).toBe(
      true
    );
  });

  test('a clean run ends at the last record, with no errors table', () => {
    const csv = generateCsv(
      collectRecordBreakers({ ...resolvedLifter, categorySheetNames: [] }, [meetResult()], {
        Adaptive_All: parseAdaptiveRecords([
          recordSheetHeader,
          recordRow('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
        ]),
      })
    );

    expect(csv).not.toContain('Errors');
  });
});
