import { ageGroups } from './ageGroups';

const REQUIRED_FIELDS = [
  'id',
  'name',
  'usawDisplayKey',
  'minimum_lifter_age',
  'maximum_lifter_age',
  'disabled',
  'customWeightClasses',
];

const YOUTH_IDS = ['U11', 'U13', 'U15', 'U17'];

describe('ageGroups data', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(ageGroups)).toBe(true);
    expect(ageGroups.length).toBeGreaterThan(0);
  });

  test('every age group has all required fields', () => {
    for (const group of ageGroups) {
      for (const field of REQUIRED_FIELDS) {
        expect(group).toHaveProperty(field);
      }
    }
  });

  test('all age group IDs are unique', () => {
    const ids = ageGroups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('includes the OPEN age group', () => {
    expect(ageGroups.find((g) => g.id === 'OPEN')).toBeDefined();
  });

  test('includes the Junior (JR) age group', () => {
    expect(ageGroups.find((g) => g.id === 'JR')).toBeDefined();
  });

  test('includes all four youth age groups', () => {
    const ids = ageGroups.map((g) => g.id);
    for (const youthId of YOUTH_IDS) {
      expect(ids).toContain(youthId);
    }
  });

  test('includes Masters age groups from 35 through 90', () => {
    const expectedIds = ['35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90'];
    const ids = ageGroups.map((g) => g.id);
    for (const id of expectedIds) {
      expect(ids).toContain(id);
    }
  });

  test('youth age groups have customWeightClasses: true', () => {
    for (const id of YOUTH_IDS) {
      const group = ageGroups.find((g) => g.id === id);
      expect(group!.customWeightClasses).toBe(true);
    }
  });

  test('non-youth age groups have customWeightClasses: false', () => {
    const nonYouth = ageGroups.filter((g) => !YOUTH_IDS.includes(g.id));
    for (const group of nonYouth) {
      expect(group.customWeightClasses).toBe(false);
    }
  });

  test('minimum_lifter_age does not exceed maximum_lifter_age', () => {
    for (const group of ageGroups) {
      expect(parseInt(group.minimum_lifter_age)).toBeLessThanOrEqual(
        parseInt(group.maximum_lifter_age)
      );
    }
  });

  test('no age groups are disabled', () => {
    for (const group of ageGroups) {
      expect(group.disabled).toBe(false);
    }
  });
});
