import { render } from '@testing-library/react';
import AssociatedPriorRecords from './AssociatedPriorRecords';
import { PriorRecord } from '../../Utils/types';

const makePriorRecord = (overrides: object = {}): PriorRecord => ({
  ageGroup: 'OPEN',
  gender: 'female',
  ageMin: 0,
  ageMax: 1000,
  bodyWeightMin: 0,
  bodyWeightMax: 49,
  bodyWeightMaxIsOpen: false,
  lift: 'Total',
  weight: '140',
  lifter: 'Jane Doe',
  event: 'Sacramento Open',
  date: '2019-05-04',
  yearSpan: '2018 - 2025',
  ...overrides,
});

describe('AssociatedPriorRecords (user-based)', () => {
  test('B-16: renders nothing when there are no records', () => {
    const { container } = render(<AssociatedPriorRecords records={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('B-16: renders the section title when records exist', () => {
    const { container } = render(<AssociatedPriorRecords records={[makePriorRecord()]} />);
    expect(container.querySelector('.page-title')?.textContent).toBe(
      'Official historic records from prior weight classes'
    );
  });

  test("B-16: a women's record row shows the year span, class, lift, and result", () => {
    const { container } = render(<AssociatedPriorRecords records={[makePriorRecord()]} />);

    const title = container.querySelector('.prior-record-title');
    expect(title?.textContent).toBe("2018 - 2025 Women's 49kg • Total:");
    const contents = container.querySelector('.prior-record-contents');
    expect(contents?.textContent).toBe('140kg - Jane Doe, 2019-05-04, Sacramento Open');
  });

  test("B-16: a men's record row uses the Men's prefix", () => {
    const { container } = render(
      <AssociatedPriorRecords
        records={[
          makePriorRecord({
            gender: 'male',
            bodyWeightMax: 109,
            lift: 'Snatch',
            weight: '155',
            lifter: 'John Doe',
            date: '2005-11-20',
            yearSpan: '1998 - 2018',
          }),
        ]}
      />
    );

    const title = container.querySelector('.prior-record-title');
    expect(title?.textContent).toBe("1998 - 2018 Men's 109kg • Snatch:");
  });

  test('B-16: an open-ended top class is labelled with a plus', () => {
    const { container } = render(
      <AssociatedPriorRecords
        records={[makePriorRecord({ bodyWeightMax: 86, bodyWeightMaxIsOpen: true })]}
      />
    );

    expect(container.querySelector('.prior-record-title')?.textContent).toBe(
      "2018 - 2025 Women's 86+kg • Total:"
    );
  });

  test('B-16: renders one row per record', () => {
    const { container } = render(
      <AssociatedPriorRecords
        records={[
          makePriorRecord({ date: '2019-05-04' }),
          makePriorRecord({ date: '2016-02-11', lift: 'Snatch' }),
        ]}
      />
    );

    expect(container.querySelectorAll('.prior-record')).toHaveLength(2);
  });

  test('B-16: switching weight classes replaces the rows, even when records share a date', () => {
    const mensRecords = [
      makePriorRecord({ gender: 'male', bodyWeightMax: 60, lifter: 'John Doe', lift: 'Snatch' }),
      makePriorRecord({
        gender: 'male',
        bodyWeightMax: 60,
        lifter: 'John Doe',
        lift: 'Clean & Jerk',
      }),
      makePriorRecord({ gender: 'male', bodyWeightMax: 60, lifter: 'John Doe', lift: 'Total' }),
    ];
    const { container, rerender } = render(<AssociatedPriorRecords records={mensRecords} />);
    expect(container.querySelectorAll('.prior-record')).toHaveLength(3);

    rerender(
      <AssociatedPriorRecords
        records={[makePriorRecord({ bodyWeightMax: 57, date: '2021-01-01' })]}
      />
    );

    const rows = container.querySelectorAll('.prior-record');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Women's 57kg");
  });
});
