import { render, screen } from '@testing-library/react';
import AllCurrentRecordsView from './AllCurrentRecordsView';
import { AgeGroup, AllCurrentRecordsEntry, StandardRecord, WeightClass } from '../../Utils/types';

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

const makeEntry = (
  weightClassOverrides: object = {},
  ageGroupOverrides: object = {},
  records: Record<string, StandardRecord> = { Total: makeRecord() }
): AllCurrentRecordsEntry => ({
  weightClass: makeWeightClass(weightClassOverrides),
  groups: [{ ageGroup: makeAgeGroup(ageGroupOverrides), records }],
});

describe('AllCurrentRecordsView (user-based)', () => {
  test('B-01: shows the loading message while there is no data', () => {
    render(<AllCurrentRecordsView data={[]} />);

    expect(screen.getByText('Loading current records…')).toBeInTheDocument();
    expect(screen.queryByText('All Current Record Holders')).toBeNull();
  });

  test('B-02: renders the title, fine print, and Women/Men columns', () => {
    render(
      <AllCurrentRecordsView
        data={[
          makeEntry(),
          makeEntry({ id: 'M60', name: "Men's 60kg", maxBodyweight: '60', gender: 'male' }),
        ]}
      />
    );

    expect(screen.getByText('All Current Record Holders')).toBeInTheDocument();
    expect(screen.getByText(/Use the dropdown above/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Women' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Men' })).toBeInTheDocument();
  });

  test('B-02: weight classes are sorted ascending by bodyweight', () => {
    const { container } = render(
      <AllCurrentRecordsView
        data={[
          makeEntry({
            id: 'W64',
            name: "Women's 64kg",
            minBodyweight: '48.01',
            maxBodyweight: '64',
          }),
          makeEntry({ id: 'W48', name: "Women's 48kg", minBodyweight: '0', maxBodyweight: '48' }),
        ]}
      />
    );

    const headers = Array.from(container.querySelectorAll('.all-records-weight-class-header')).map(
      (node) => node.textContent
    );
    expect(headers).toEqual(["Women's 48kg", "Women's 64kg"]);
  });

  test('B-02: a record row shows the lift label, weight, lifter, event, and date', () => {
    render(<AllCurrentRecordsView data={[makeEntry()]} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('80kg')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/Sacramento Open/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument();
  });

  test('B-02: entries sharing a max bodyweight merge into one weight class section', () => {
    const { container } = render(
      <AllCurrentRecordsView
        data={[
          makeEntry({}, { id: 'OPEN', name: 'Open' }),
          makeEntry({}, { id: 'JR', name: 'Junior (15-20 years old)' }),
        ]}
      />
    );

    expect(container.querySelectorAll('.all-records-weight-class-header')).toHaveLength(1);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Junior (15-20 years old)')).toBeInTheDocument();
  });

  test('B-02: distinct "+" weight classes are not merged just because they share the placeholder max bodyweight', () => {
    const { container } = render(
      <AllCurrentRecordsView
        data={[
          makeEntry(
            { id: 'W86plus', minBodyweight: '86.01', maxBodyweight: '1000' },
            {},
            { Total: makeRecord({ lifter: 'Adult Plus Lifter' }) }
          ),
          makeEntry(
            { id: 'W63plus', minBodyweight: '63.01', maxBodyweight: '1000' },
            { id: 'U11', name: 'Under 11' },
            { Total: makeRecord({ lifter: 'Youth Plus Lifter' }) }
          ),
        ]}
      />
    );

    const headers = Array.from(container.querySelectorAll('.all-records-weight-class-header')).map(
      (node) => node.textContent
    );
    expect(headers).toEqual(["Women's 86+kg", "Women's 63+kg"]);
    expect(screen.getByText('Adult Plus Lifter')).toBeInTheDocument();
    expect(screen.getByText('Youth Plus Lifter')).toBeInTheDocument();
  });

  test('B-02: merged age-group rows display youngest to oldest: Open, youth (youngest first), Junior, Masters (youngest first)', () => {
    const { container } = render(
      <AllCurrentRecordsView
        data={[
          // Pushed out of display order on purpose, and sharing a minBodyweight so
          // they land in the same merged section.
          makeEntry({ minBodyweight: '48.01' }, { id: '55', name: '55 - 59 years old' }),
          makeEntry({ minBodyweight: '48.01' }, { id: 'U17', name: 'Under 17' }),
          makeEntry({ minBodyweight: '48.01' }, { id: 'OPEN', name: 'Open' }),
          makeEntry({ minBodyweight: '48.01' }, { id: '35', name: '35 - 39 years old' }),
          makeEntry({ minBodyweight: '48.01' }, { id: 'JR', name: 'Junior' }),
          makeEntry({ minBodyweight: '48.01' }, { id: 'U11', name: 'Under 11' }),
        ]}
      />
    );

    const names = Array.from(container.querySelectorAll('.all-records-age-group-name')).map(
      (node) => node.textContent
    );
    expect(names).toEqual([
      'Open',
      'Under 11',
      'Under 17',
      'Junior',
      '35 - 39 years old',
      '55 - 59 years old',
    ]);
  });

  test('B-02: genders are split into their own columns', () => {
    const { container } = render(
      <AllCurrentRecordsView
        data={[
          makeEntry(),
          makeEntry({ id: 'M60', name: "Men's 60kg", maxBodyweight: '60', gender: 'male' }),
        ]}
      />
    );

    const columns = container.querySelectorAll('.all-records-column');
    expect(columns).toHaveLength(2);
    expect(columns[0].textContent).toContain("Women's 48kg");
    expect(columns[0].textContent).not.toContain("Men's 60kg");
    expect(columns[1].textContent).toContain("Men's 60kg");
  });
});
