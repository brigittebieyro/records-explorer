import { defaultWeightClasses } from './defaultWeightClasses';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from './youthWeightClasses';
import { WeightClass } from '../Utils/types';

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

function sharedWeightClassTests(weightClasses: WeightClass[]) {
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
    const plusClasses = weightClasses.filter((wc) => wc.id.endsWith('plus') || wc.id.endsWith('+'));
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

  test('no two classes of the same gender share a minBodyweight', () => {
    for (const gender of ['male', 'female'] as const) {
      const classes = weightClasses.filter((wc) => wc.gender === gender);
      const mins = classes.map((wc) => wc.minBodyweight);
      expect(new Set(mins).size).toBe(mins.length);
    }
  });

  test('no two classes of the same gender share a maxBodyweight', () => {
    for (const gender of ['male', 'female'] as const) {
      const classes = weightClasses.filter((wc) => wc.gender === gender);
      const maxes = classes.map((wc) => wc.maxBodyweight);
      expect(new Set(maxes).size).toBe(maxes.length);
    }
  });
}

describe('defaultWeightClasses', () => {
  sharedWeightClassTests(defaultWeightClasses);

  test("has exactly 8 women's weight classes", () => {
    expect(defaultWeightClasses.filter((wc) => wc.gender === 'female')).toHaveLength(8);
  });

  test("has exactly 8 men's weight classes", () => {
    expect(defaultWeightClasses.filter((wc) => wc.gender === 'male')).toHaveLength(8);
  });

  test("W48 is the lightest women's class", () => {
    const femaleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'female');
    const lightest = femaleClasses.reduce((a, b) =>
      parseFloat(a.maxBodyweight) < parseFloat(b.maxBodyweight) ? a : b
    );
    expect(lightest.id).toBe('W48');
  });

  test("M60 is the lightest men's class", () => {
    const maleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'male');
    const lightest = maleClasses.reduce((a, b) =>
      parseFloat(a.maxBodyweight) < parseFloat(b.maxBodyweight) ? a : b
    );
    expect(lightest.id).toBe('M60');
  });

  test("women's weight classes have continuous boundaries with no gaps", () => {
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
});

describe('u11WeightClasses', () => {
  sharedWeightClassTests(u11WeightClasses);
});

describe('u13WeightClasses', () => {
  sharedWeightClassTests(u13WeightClasses);
});

describe('u15WeightClasses', () => {
  sharedWeightClassTests(u15WeightClasses);
});

describe('u17WeightClasses', () => {
  sharedWeightClassTests(u17WeightClasses);
});
