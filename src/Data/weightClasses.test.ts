import { defaultWeightClasses } from './defaultWeightClasses';
import {
  u11WeightClasses,
  u13WeightClasses,
  u15WeightClasses,
  u17WeightClasses,
} from './youthWeightClasses';
import { WeightClass } from '../Utils/types';

// Removed auto-generated tests verifying that defined weight classes all match the defined type.
// These are wasteful because typescript does this for us, do not re-add.
// Also removed auto-generated tests verifying no duplicate weight class weights.
// Youth weight classes may very well interact with adult classes in this way.

function sharedWeightClassTests(weightClasses: WeightClass[]) {
  test('is a non-empty array', () => {
    expect(Array.isArray(weightClasses)).toBe(true);
    expect(weightClasses.length).toBeGreaterThan(0);
  });

  test('all IDs are unique within the set', () => {
    const ids = weightClasses.map((wc) => wc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('minBodyweight is less than maxBodyweight for every class', () => {
    for (const wc of weightClasses) {
      expect(parseFloat(wc.minBodyweight)).toBeLessThan(parseFloat(wc.maxBodyweight));
    }
  });

  test('start date is a parseable year after 1975', () => {
    for (const wc of weightClasses) {
      expect(new Date(wc.start).getFullYear()).toBeGreaterThan(1975);
    }
  });

  test('includes weight classes for both genders', () => {
    expect(weightClasses.some((wc) => wc.gender === 'female')).toBe(true);
    expect(weightClasses.some((wc) => wc.gender === 'male')).toBe(true);
  });
}

describe('defaultWeightClasses', () => {
  sharedWeightClassTests(defaultWeightClasses);
  // Removed auto-generated tests verifying specific values for weight classes.
  // These are subject to change and configurable for a REASON.
  test("women's weight classes have continuous boundaries with no gaps", () => {
    const femaleClasses = defaultWeightClasses
      .filter((wc) => wc.gender === 'female')
      .sort(
        (wtClassA, wtClassB) => Number(wtClassA.minBodyweight) - Number(wtClassB.minBodyweight)
      );

    expect(Number(femaleClasses[0].minBodyweight)).toBe(0);
    expect(femaleClasses[femaleClasses.length - 1].maxBodyweight).toBe('1000');

    for (let i = 1; i < femaleClasses.length; i++) {
      const prevMax = Number(femaleClasses[i - 1].maxBodyweight);
      const currMin = Number(femaleClasses[i].minBodyweight);
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
