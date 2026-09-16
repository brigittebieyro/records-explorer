import { ageCategories, buildPastRecordCategory } from './pastRecordCertificate';
import { ageGroups } from '../Data/ageGroups';

const input = (overrides = {}) => ({
  division: "Women's",
  ageCategory: 'Open',
  weightClass: '53',
  ...overrides,
});

describe('buildPastRecordCategory (user-based)', () => {
  test('F-06: reads gender, then age group, then bodyweight', () => {
    // The same order buildCertificateCategory uses, which is the opposite of how the class reads
    // on screen. A hand-typed certificate has to be indistinguishable from a printed one.
    expect(buildPastRecordCategory(input())).toBe("Women's Open 53kg");
  });

  test('F-07: an open top class carries the plus it was typed with', () => {
    expect(buildPastRecordCategory(input({ weightClass: '86+' }))).toBe("Women's Open 86+kg");
  });

  test('F-06: the youth divisions read as the site names them', () => {
    expect(
      buildPastRecordCategory(
        input({ division: 'Girls', ageCategory: 'Under 15', weightClass: '40' })
      )
    ).toBe('Girls Under 15 40kg');
    expect(
      buildPastRecordCategory(
        input({ division: 'Boys', ageCategory: 'Under 13', weightClass: '32' })
      )
    ).toBe('Boys Under 13 32kg');
  });

  test('F-06: a masters age category is passed through as written', () => {
    expect(buildPastRecordCategory(input({ ageCategory: 'Masters (35-39)' }))).toBe(
      "Women's Masters (35-39) 53kg"
    );
  });

  test('F-06: a missing part closes the gap instead of leaving a double space', () => {
    expect(buildPastRecordCategory(input({ ageCategory: '' }))).toBe("Women's 53kg");
    expect(buildPastRecordCategory(input({ weightClass: '' }))).toBe("Women's Open");
  });

  test('F-06: surrounding whitespace is trimmed off each part', () => {
    expect(buildPastRecordCategory(input({ ageCategory: '  Open  ', weightClass: ' 53 ' }))).toBe(
      "Women's Open 53kg"
    );
  });

  test('F-06: a blank weight class drops the kg with it', () => {
    expect(buildPastRecordCategory(input({ weightClass: '' }))).toBe("Women's Open");
  });
});

describe('ageCategories (user-based)', () => {
  test('F-06: every age group the site knows is offered', () => {
    expect(ageCategories).toHaveLength(ageGroups.length);
    expect(ageCategories.map((option) => option.value)).toEqual(
      ageGroups.map((ageGroup) => ageGroup.certificateDisplayKey)
    );
  });

  test('F-06: the value is the certificate wording, comma and all', () => {
    // The comma is deliberate -- these sit mid-sentence, as "Girls Under 11, 30kg".
    expect(ageCategories).toContainEqual({ value: 'Open', label: 'Open', disabled: false });
    expect(ageCategories).toContainEqual({
      value: 'Masters 35-39,',
      label: 'Masters 35-39',
      disabled: false,
    });
  });

  test('F-06: a chosen age group reads correctly in the finished class line', () => {
    const masters = ageCategories.find((option) => option.label === 'Masters 35-39');
    expect(
      buildPastRecordCategory({
        division: "Women's",
        ageCategory: masters ? masters.value : '',
        weightClass: '53',
      })
    ).toBe("Women's Masters 35-39, 53kg");
  });
});
