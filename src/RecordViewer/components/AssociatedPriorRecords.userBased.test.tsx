import { render, screen } from '@testing-library/react';
import AssociatedPriorRecords from './AssociatedPriorRecords';
import { PriorRecord } from '../../Utils/types';

const makePriorRecord = (overrides: object = {}): PriorRecord => ({
  ageGroup: 'OPEN',
  gender: 'female',
  ageMin: 0,
  ageMax: 1000,
  bodyWeightMin: 0,
  bodyWeightMax: 49,
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
    render(<AssociatedPriorRecords records={[makePriorRecord()]} />);
    expect(screen.getByText('Records from prior weight classes')).toBeInTheDocument();
  });

  test("B-16: a women's record row shows the year span, class, lift, and result", () => {
    const { container } = render(<AssociatedPriorRecords records={[makePriorRecord()]} />);

    const title = container.querySelector('.prior-record-title');
    expect(title?.textContent).toBe("2018 - 2025 Women's 49kg Total:");
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
    expect(title?.textContent).toBe("1998 - 2018 Men's 109kg Snatch:");
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
});
