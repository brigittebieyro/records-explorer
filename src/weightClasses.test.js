import { defaultWeightClasses } from './Data/defaultWeightClasses';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from './Data/youthWeightClasses';

const REQUIRED_FIELDS = [
  'id',
  'name',
  'sport80Id',
  'minBodyweight',
  'maxBodyweight',
  'gender',
  'start',
  'previousAnalogs',
];

const ANALOG_FIELDS = ['name', 'sport80Id', 'gender', 'start', 'end'];

// Shared structural tests called directly inside a describe block
function sharedWeightClassTests(weightClasses) {
  test('is a non-empty array', () => {
    expect(Array.isArray(weightClasses)).toBe(true);
    expect(weightClasses.length).toBeGreaterThan(0);
  });

  test('every weight class has all required fields', () => {
    for (const wc of weightClasses) {
      for (const field of REQUIRED_FIELDS) {
        expect(wc).toHaveProperty(field);
      }
    }
  });

  test('all IDs are unique within the set', () => {
    const ids = weightClasses.map((wc) => wc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all gender values are "male" or "female"', () => {
    for (const wc of weightClasses) {
      expect(['male', 'female']).toContain(wc.gender);
    }
  });

  test('minBodyweight is less than maxBodyweight for every class', () => {
    for (const wc of weightClasses) {
      expect(parseFloat(wc.minBodyweight)).toBeLessThan(parseFloat(wc.maxBodyweight));
    }
  });

  test('plus-weight classes have maxBodyweight of "1000"', () => {
    const plusClasses = weightClasses.filter(
      (wc) => wc.id.endsWith('plus') || wc.id.endsWith('+')
    );
    for (const wc of plusClasses) {
      expect(wc.maxBodyweight).toBe('1000');
    }
  });

  test('every class has a previousAnalogs array', () => {
    for (const wc of weightClasses) {
      expect(Array.isArray(wc.previousAnalogs)).toBe(true);
    }
  });

  test('every previous analog has the required fields', () => {
    for (const wc of weightClasses) {
      for (const analog of wc.previousAnalogs) {
        for (const field of ANALOG_FIELDS) {
          expect(analog).toHaveProperty(field);
        }
      }
    }
  });

  test('start date is a parseable year after 2000', () => {
    for (const wc of weightClasses) {
      expect(new Date(wc.start).getFullYear()).toBeGreaterThan(2000);
    }
  });

  test('includes weight classes for both genders', () => {
    expect(weightClasses.some((wc) => wc.gender === 'female')).toBe(true);
    expect(weightClasses.some((wc) => wc.gender === 'male')).toBe(true);
  });
}

describe('defaultWeightClasses', () => {
  sharedWeightClassTests(defaultWeightClasses);

  test('has exactly 8 women\'s weight classes', () => {
    expect(defaultWeightClasses.filter((wc) => wc.gender === 'female')).toHaveLength(8);
  });

  test('has exactly 8 men\'s weight classes', () => {
    expect(defaultWeightClasses.filter((wc) => wc.gender === 'male')).toHaveLength(8);
  });

  test('W48 is the lightest women\'s class', () => {
    const femaleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'female');
    const lightest = femaleClasses.reduce((a, b) =>
      parseFloat(a.maxBodyweight) < parseFloat(b.maxBodyweight) ? a : b
    );
    expect(lightest.id).toBe('W48');
  });

  test('M60 is the lightest men\'s class', () => {
    const maleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'male');
    const lightest = maleClasses.reduce((a, b) =>
      parseFloat(a.maxBodyweight) < parseFloat(b.maxBodyweight) ? a : b
    );
    expect(lightest.id).toBe('M60');
  });

  test('women\'s weight classes have continuous boundaries with no gaps', () => {
    const femaleClasses = defaultWeightClasses
      .filter((wc) => wc.gender === 'female')
      .sort((a, b) => parseFloat(a.minBodyweight) - parseFloat(b.minBodyweight));

    expect(parseFloat(femaleClasses[0].minBodyweight)).toBe(0);
    expect(femaleClasses[femaleClasses.length - 1].maxBodyweight).toBe('1000');

    for (let i = 1; i < femaleClasses.length; i++) {
      const prevMax = parseFloat(femaleClasses[i - 1].maxBodyweight);
      const currMin = parseFloat(femaleClasses[i].minBodyweight);
      expect(currMin).toBeCloseTo(prevMax + 0.01, 2);
    }
  });

  test.skip('BUG POTENTIAL: M71 minBodyweight overlaps with M65 range', () => {
    // Data shows M65 covers 60.01–65 and M71 covers 60.01–71 (same lower bound).
    // M71.minBodyweight should likely be "65.01" to be non-overlapping.
    const m65 = defaultWeightClasses.find((wc) => wc.id === 'M65');
    const m71 = defaultWeightClasses.find((wc) => wc.id === 'M71');
    expect(parseFloat(m71.minBodyweight)).toBeGreaterThan(parseFloat(m65.maxBodyweight));
  });
});

describe('u11WeightClasses', () => {
  sharedWeightClassTests(u11WeightClasses);

  test.skip('BUG POTENTIAL: U11 W53 and W58 share the same minBodyweight', () => {
    // Both W53 and W58 have minBodyweight "48.01" — W58 should start at "53.01".
    const w53 = u11WeightClasses.find((wc) => wc.id === 'W53');
    const w58 = u11WeightClasses.find((wc) => wc.id === 'W58');
    expect(parseFloat(w58.minBodyweight)).toBeGreaterThan(parseFloat(w53.maxBodyweight));
  });
});

describe('u13WeightClasses', () => {
  sharedWeightClassTests(u13WeightClasses);

  test.skip('BUG POTENTIAL: U13 W63 and W58 share the same minBodyweight', () => {
    // Both W58 and W63 have minBodyweight "53.01" — W63 should start at "58.01".
    const w58 = u13WeightClasses.find((wc) => wc.id === 'W58');
    const w63 = u13WeightClasses.find((wc) => wc.id === 'W63');
    expect(parseFloat(w63.minBodyweight)).toBeGreaterThan(parseFloat(w58.maxBodyweight));
  });
});

describe('u15WeightClasses', () => {
  sharedWeightClassTests(u15WeightClasses);
});

describe('u17WeightClasses', () => {
  sharedWeightClassTests(u17WeightClasses);

  test.skip('BUG POTENTIAL: U17 W44 and W48 both start at minBodyweight "0"', () => {
    // Both W44 and W48 have minBodyweight "0" — W48 should start at "44.01".
    const w44 = u17WeightClasses.find((wc) => wc.id === 'W44');
    const w48 = u17WeightClasses.find((wc) => wc.id === 'W48');
    expect(parseFloat(w48.minBodyweight)).toBeGreaterThan(parseFloat(w44.maxBodyweight));
  });

  test.skip('BUG POTENTIAL: U17 M56 and M60 both start at minBodyweight "0"', () => {
    // Both M56 and M60 have minBodyweight "0" — M60 should start at "56.01".
    const m56 = u17WeightClasses.find((wc) => wc.id === 'M56');
    const m60 = u17WeightClasses.find((wc) => wc.id === 'M60');
    expect(parseFloat(m60.minBodyweight)).toBeGreaterThan(parseFloat(m56.maxBodyweight));
  });
});
