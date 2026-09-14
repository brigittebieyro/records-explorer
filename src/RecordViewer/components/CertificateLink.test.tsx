import { render, screen } from '@testing-library/react';
import CertificateLink, {
  buildCertificateCategory,
  buildCertificateHref,
  weightClassIndicator,
} from './CertificateLink';
import { ageGroups } from '../../Data/ageGroups';
import { AgeGroup, WeightClass } from '../../Utils/types';

const ageGroupById = (id: string): AgeGroup =>
  ageGroups.find((group) => group.id === id) as AgeGroup;

const makeWeightClass = (overrides: object = {}): WeightClass =>
  ({
    id: 'W53',
    name: "Women's 53kg",
    sport80Id: 1,
    minBodyweight: '49',
    maxBodyweight: '53',
    gender: 'female',
    start: '2025-06-01',
    ...overrides,
  }) as WeightClass;

describe('buildCertificateHref', () => {
  test('B-27: encodes a lift name containing an ampersand', () => {
    const href = buildCertificateHref({
      sheet: 'Post-Aug2026',
      ageGroup: 'OPEN',
      gender: 'female',
      weightClass: '53',
      lift: 'Clean & Jerk',
    });
    // A bare template literal would truncate the lift at the ampersand and silently request
    // lift=Clean, which matches nothing.
    expect(href).toContain('lift=Clean+%26+Jerk');
    expect(new URLSearchParams(href.split('?')[1]).get('lift')).toBe('Clean & Jerk');
  });

  test('B-27: encodes the > in an open-ended weight class', () => {
    const href = buildCertificateHref({
      sheet: 'Post-Aug2026',
      ageGroup: 'OPEN',
      gender: 'female',
      weightClass: '>86',
      lift: 'Total',
    });
    expect(href).toContain('weightClass=%3E86');
    expect(new URLSearchParams(href.split('?')[1]).get('weightClass')).toBe('>86');
  });

  test('carries every parameter the endpoint requires', () => {
    const params = new URLSearchParams(
      buildCertificateHref({
        sheet: 'Adaptive_Physical',
        ageGroup: 'U11',
        gender: 'male',
        weightClass: '30',
        lift: 'Snatch',
      }).split('?')[1]
    );
    expect(Object.fromEntries(params)).toEqual({
      sheet: 'Adaptive_Physical',
      ageGroup: 'U11',
      gender: 'male',
      weightClass: '30',
      lift: 'Snatch',
    });
  });
});

describe('weightClassIndicator', () => {
  test('uses the max bodyweight for a normal class', () => {
    expect(weightClassIndicator(makeWeightClass())).toBe('53');
  });

  test('uses > plus the minimum for the open-ended top class', () => {
    // Mirrors computeStandardsForWeightClass, which keys the top class of each set this way.
    expect(
      weightClassIndicator(makeWeightClass({ minBodyweight: '86', maxBodyweight: '1000' }))
    ).toBe('>86');
  });
});

describe('CertificateLink', () => {
  test('B-27: opens in a new tab with a safe rel', () => {
    render(
      <CertificateLink
        sheet="Post-Aug2026"
        ageGroup="OPEN"
        gender="female"
        weightClass="53"
        lift="Snatch"
      />
    );
    const link = screen.getByRole('link', { name: /^print$/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.getAttribute('href')).toContain('/api/certificate?');
  });
});

describe('buildCertificateCategory', () => {
  test('puts the gender before the age group and the bodyweight last', () => {
    expect(buildCertificateCategory(makeWeightClass(), ageGroupById('OPEN'))).toBe(
      `Women's ${ageGroupById('OPEN').certificateDisplayKey} 53kg`
    );
  });

  test('uses the Girls/Boys wording the youth weight class data already carries', () => {
    // Taken from weightClass.name rather than recomputed, so it cannot disagree with the site.
    const youth = makeWeightClass({ name: 'Girls 30kg', maxBodyweight: '30' });
    expect(buildCertificateCategory(youth, ageGroupById('U11'))).toBe(
      `Girls ${ageGroupById('U11').certificateDisplayKey} 30kg`
    );
  });

  test('keeps the + of an open-ended class', () => {
    const top = makeWeightClass({
      name: "Women's 86+kg",
      minBodyweight: '86',
      maxBodyweight: '1000',
    });
    expect(buildCertificateCategory(top, ageGroupById('OPEN'))).toBe(
      `Women's ${ageGroupById('OPEN').certificateDisplayKey} 86+kg`
    );
  });

  test('leads with the adaptive category when there is one', () => {
    expect(
      buildCertificateCategory(makeWeightClass(), ageGroupById('OPEN'), 'Adaptive (Overall)')
    ).toBe(`Adaptive (Overall) Women's ${ageGroupById('OPEN').certificateDisplayKey} 53kg`);
  });

  test('tracks edits to ageGroups.ts without any other file changing', () => {
    // This is the whole point of passing the wording from the client: src/Data is the single
    // source of truth, so a new certificateDisplayKey shows up on the certificate immediately.
    const edited = { ...ageGroupById('OPEN'), certificateDisplayKey: 'Brand New Wording' };
    expect(buildCertificateCategory(makeWeightClass(), edited)).toBe(
      "Women's Brand New Wording 53kg"
    );
  });

  test('the composed wording survives the round trip through the URL', () => {
    const category = buildCertificateCategory(
      makeWeightClass(),
      ageGroupById('OPEN'),
      'Adaptive (Deaf and Hard of Hearing)'
    );
    const href = buildCertificateHref({
      sheet: 'Adaptive_Hearing',
      ageGroup: 'OPEN',
      gender: 'female',
      weightClass: '53',
      lift: 'Snatch',
      category,
    });
    // Spaces, parentheses and the apostrophe all need encoding.
    expect(new URLSearchParams(href.split('?')[1]).get('category')).toBe(category);
  });

  test('the category is omitted from the URL when there is none', () => {
    const href = buildCertificateHref({
      sheet: 'Post-Aug2026',
      ageGroup: 'OPEN',
      gender: 'female',
      weightClass: '53',
      lift: 'Snatch',
    });
    expect(href).not.toContain('category=');
  });
});
