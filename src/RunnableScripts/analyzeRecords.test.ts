import { generateCsv, RecordBreaker } from './analyzeRecords';

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
