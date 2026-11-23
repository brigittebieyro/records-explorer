import { generateCsv, generateSummary, RecordBreaker } from './analyzeRecords';

const breaker = (overrides: Partial<RecordBreaker> = {}): RecordBreaker => ({
  liftType: 'snatch',
  athlete: 'Jane Smith',
  weight: 70,
  ageGroup: 'OPEN',
  weightClassName: "Women's 77kg",
  gender: 'F',
  ageMin: '0',
  ageMax: '1000',
  bodyWeightMin: 69,
  bodyWeightMax: '77',
  date: '2026-08-09',
  event: 'Money In The Bank 2026',
  clubName: 'Catalyst Athletics',
  wouldBreak: 65,
  currentHolder: 'Jane B. Smith',
  ageGroupIndex: 0,
  weightClassIndex: 0,
  ...overrides,
});

const csvHeader =
  'ageGroup,gender,ageMin,ageMax,bodyWeightMin,bodyWeightMax,lift,record,name,date,place,clubName,Previous Record,Previous Holder,Weight Class';

describe('generateCsv', () => {
  test('writes the records sheet columns, then the previous-record columns', () => {
    const lines = generateCsv([breaker()]).trim().split('\n');

    expect(lines[0]).toBe(csvHeader);
    expect(lines[1]).toBe(
      "OPEN,F,0,1000,69,77,Snatch,70,Jane Smith,2026-08-09,Money In The Bank 2026,Catalyst Athletics,65,Jane B. Smith,Women's 77kg"
    );
  });

  test('writes masters and top-class rows the way the sheet does', () => {
    const lines = generateCsv([
      breaker({
        liftType: 'total',
        ageGroup: 'W35',
        ageMin: '35',
        ageMax: '39',
        bodyWeightMin: 86,
        bodyWeightMax: '>86',
        weightClassName: "Women's 86+kg",
        clubName: '',
      }),
    ])
      .trim()
      .split('\n');

    expect(lines[1]).toBe(
      "W35,F,35,39,86,>86,Total,70,Jane Smith,2026-08-09,Money In The Bank 2026,,65,Jane B. Smith,Women's 86+kg"
    );
  });

  test('an empty run still produces the header', () => {
    expect(generateCsv([])).toBe(`${csvHeader}\n`);
  });
});

describe('generateSummary', () => {
  const rtfHeader = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Helvetica;}}\\f0\\fs24\n';
  const bullet = '\\u8226?';
  // The RTF body between the header and the closing brace.
  const body = (rtf: string): string => {
    expect(rtf.startsWith(rtfHeader)).toBe(true);
    expect(rtf.endsWith('\n}\n')).toBe(true);
    return rtf.slice(rtfHeader.length, -'\n}\n'.length);
  };
  const block = (heading: string, line2: string, lifts: string): string =>
    `{\\b ${heading}}\\line\n${line2}\\line\n${lifts}\\par`;
  const blocks = (...parts: string[]): string => parts.join('\n\\par\n');

  test("writes an athlete's lifts as one block, in lift order", () => {
    const summary = generateSummary([
      breaker({ liftType: 'total', weight: 106 }),
      breaker({ liftType: 'snatch', weight: 45 }),
      breaker({ liftType: 'clean & jerk', weight: 61 }),
    ]);

    expect(body(summary)).toBe(
      block(
        'Jane Smith',
        `Open Women ${bullet} 77kg`,
        `45kg Snatch ${bullet} 61kg Clean & Jerk ${bullet} 106kg Total`
      )
    );
  });

  test('capitalizes the first letter of each word and lowercases the rest', () => {
    const summary = generateSummary([breaker({ athlete: "MARY-JANE o'NEIL  van DYKE" })]);

    expect(body(summary)).toContain("{\\b Mary-Jane O'neil  Van Dyke}");
  });

  test('names youth groups girls/boys, masters gender first, and others age group first', () => {
    const summary = generateSummary([
      breaker({ athlete: 'A', ageGroup: 'U11', ageGroupIndex: 1, weightClassName: 'Girls 61+kg' }),
      breaker({
        athlete: 'B',
        gender: 'M',
        ageGroup: 'U13',
        ageGroupIndex: 2,
        weightClassName: 'Boys 70+kg',
      }),
      breaker({ athlete: 'C', ageGroup: 'JR', ageGroupIndex: 5, weightClassName: "Women's 86+kg" }),
      breaker({ athlete: 'D', ageGroup: 'W40', ageGroupIndex: 7, weightClassName: "Women's 61kg" }),
      breaker({
        athlete: 'E',
        gender: 'M',
        ageGroup: 'M40',
        ageGroupIndex: 7,
        weightClassName: "Men's 110+kg",
        weightClassIndex: 20,
      }),
    ]);

    const text = body(summary);
    expect(text).toContain(`Under 11 Girls ${bullet} 61+kg`);
    expect(text).toContain(`Under 13 Boys ${bullet} 70+kg`);
    expect(text).toContain(`Junior (15-20 years old) Women ${bullet} 86+kg`);
    expect(text).toContain(`Women 40 - 44 years old ${bullet} 61kg`);
    expect(text).toContain(`Men 40 - 44 years old ${bullet} 110+kg`);
  });

  test('orders blocks by age group, then weight class', () => {
    const summary = generateSummary([
      breaker({ athlete: 'Third', ageGroup: 'W40', ageGroupIndex: 7 }),
      breaker({ athlete: 'Second', weightClassIndex: 3, weightClassName: "Women's 86+kg" }),
      breaker({ athlete: 'First' }),
    ]);

    const headings = [...body(summary).matchAll(/\{\\b ([^}]*)\}/g)].map((match) => match[1]);
    expect(headings).toEqual(['First', 'Second', 'Third']);
  });

  test('keeps only the heaviest lift when several athletes break the same record', () => {
    const summary = generateSummary([
      breaker({ athlete: 'Lighter', weight: 70 }),
      breaker({ athlete: 'Heavier', weight: 72 }),
    ]);

    expect(body(summary)).toBe(block('Heavier', `Open Women ${bullet} 77kg`, '72kg Snatch'));
  });

  test('on equal weight, keeps the earlier lift', () => {
    const summary = generateSummary([
      breaker({ athlete: 'Later', date: '2026-08-09' }),
      breaker({ athlete: 'Earlier', date: '2026-03-01' }),
    ]);

    expect(body(summary)).toBe(block('Earlier', `Open Women ${bullet} 77kg`, '70kg Snatch'));
  });

  test('a same-day tie gets its own block, and the other lifts stay in their own', () => {
    const summary = generateSummary([
      breaker({ athlete: 'Athlete One' }),
      breaker({ athlete: 'Athlete Two' }),
      breaker({ athlete: 'Athlete One', liftType: 'total', weight: 150 }),
    ]);

    expect(body(summary)).toBe(
      blocks(
        block('TIED!! Athlete One & Athlete Two', `Open Women ${bullet} 77kg`, '70kg Snatch'),
        block('Athlete One', `Open Women ${bullet} 77kg`, '150kg Total')
      )
    );
  });

  test('records in different classes do not compete with each other', () => {
    const summary = generateSummary([
      breaker({ athlete: 'Open', weight: 70 }),
      breaker({ athlete: 'Masters', weight: 60, ageGroup: 'W40', ageGroupIndex: 7 }),
    ]);

    expect(body(summary)).toBe(
      blocks(
        block('Open', `Open Women ${bullet} 77kg`, '70kg Snatch'),
        block('Masters', `Women 40 - 44 years old ${bullet} 77kg`, '60kg Snatch')
      )
    );
  });

  test('escapes RTF control characters and non-ASCII letters in names', () => {
    const summary = generateSummary([breaker({ athlete: 'josé {x}\\' })]);

    expect(body(summary)).toContain('{\\b Jos\\u233? \\{x\\}\\\\}');
  });

  test('an empty run says there are no new records', () => {
    expect(body(generateSummary([]))).toBe('No new records.\\par');
  });
});
