import { render, screen } from '@testing-library/react';
import RecordListForWeightClass from './RecordListForWeightClass';
import { AgeGroup, StandardRecord, WeightClass } from '../../Utils/types';

const makeAgeGroup = (overrides: object = {}): AgeGroup =>
  ({
    id: 'OPEN',
    name: 'Open',
    usawDisplayKey: 'Open',
    minimum_lifter_age: '0',
    maximum_lifter_age: '1000',
    disabled: false,
    customWeightClasses: false,
    ...overrides,
  }) as AgeGroup;

const makeWeightClass = (overrides: object = {}): WeightClass =>
  ({
    id: 'W48',
    name: "Women's 48kg",
    sport80Id: 709,
    minBodyweight: '0',
    maxBodyweight: '48',
    gender: 'female',
    start: '2025-06-01',
    ...overrides,
  }) as WeightClass;

const makeRecord = (overrides: object = {}): StandardRecord => ({
  weight: '80',
  lifter: 'Jane Doe',
  event: 'Sacramento Open',
  date: '2026-01-15',
  ...overrides,
});

describe('RecordListForWeightClass (user-based)', () => {
  test("B-02: renders a Women's display name from the max bodyweight", () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass()}
        groups={[{ ageGroup: makeAgeGroup(), records: { Total: makeRecord() } }]}
      />
    );
    expect(screen.getByRole('heading', { name: "Women's 48kg" })).toBeInTheDocument();
  });

  test("B-02: renders a Men's display name for male classes", () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass({ gender: 'male', maxBodyweight: '110' })}
        groups={[{ ageGroup: makeAgeGroup(), records: { Total: makeRecord() } }]}
      />
    );
    expect(screen.getByRole('heading', { name: "Men's 110kg" })).toBeInTheDocument();
  });

  test('B-02: superheavy classes render as a threshold-plus name', () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass({ minBodyweight: '86.01', maxBodyweight: '1000' })}
        groups={[{ ageGroup: makeAgeGroup(), records: { Total: makeRecord() } }]}
      />
    );
    expect(screen.getByRole('heading', { name: "Women's 86+kg" })).toBeInTheDocument();
  });

  test('B-02: only the lift types with records show labels', () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass()}
        groups={[
          {
            ageGroup: makeAgeGroup(),
            records: { Snatch: makeRecord({ weight: '60' }), Total: makeRecord() },
          },
        ]}
      />
    );

    expect(screen.getByText('Snatch')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.queryByText('Clean & Jerk')).toBeNull();
  });

  test('B-02: each age group row shows its name in bold', () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass()}
        groups={[
          { ageGroup: makeAgeGroup(), records: { Total: makeRecord() } },
          {
            ageGroup: makeAgeGroup({ id: '35', name: '35 - 39 years old' }),
            records: { Total: makeRecord({ lifter: 'Masters Lifter' }) },
          },
        ]}
      />
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('35 - 39 years old')).toBeInTheDocument();
    expect(screen.getByText('Masters Lifter')).toBeInTheDocument();
  });
});
