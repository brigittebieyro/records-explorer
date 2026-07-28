import { render, screen } from '@testing-library/react';
import RecordHolder from './RecordHolder';
import { CombinedLiftData } from '../../Utils/types';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

const makeLifter = (overrides: object = {}): CombinedLiftData =>
  ({
    name: 'Jane Doe',
    total: 180,
    lifter_age: '25',
    lift_date: '2026-01-15',
    club: 'Sacramento Barbell',
    action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/12345' }],
    best_snatch: 80,
    'best_c&j': 100,
    meet: 'Sacramento Open',
    ...overrides,
  }) as unknown as CombinedLiftData;

describe('RecordHolder (user-based)', () => {
  test('B-10: renders the lifter name, lifts, age, date, and club', () => {
    render(
      <RecordHolder lifterData={makeLifter()} index={0} individualLiftsData={[]} sortType="total" />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('Snatch:')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('Clean and Jerk:')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Age:')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('Club:')).toBeInTheDocument();
    expect(screen.getByText('Sacramento Barbell')).toBeInTheDocument();
    expect(screen.getByText('Sacramento Open')).toBeInTheDocument();
  });

  test('B-10: lifters without a club show Unaffiliated', () => {
    render(
      <RecordHolder
        lifterData={makeLifter({ club: null })}
        index={0}
        individualLiftsData={[]}
        sortType="total"
      />
    );

    expect(screen.getByText('Unaffiliated')).toBeInTheDocument();
  });

  test('B-10: shows a per-card spinner while individual lifts have not loaded', () => {
    render(
      <RecordHolder
        lifterData={makeLifter({ best_snatch: undefined, 'best_c&j': undefined })}
        index={0}
        individualLiftsData={[]}
        sortType="total"
      />
    );

    expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    expect(screen.getByText('Verifying')).toBeInTheDocument();
  });

  test('B-10: merges lazily loaded individual lifts into the card', () => {
    const individualLift = makeLifter({ best_snatch: 82, 'best_c&j': 98, date: '2026-01-15' });
    render(
      <RecordHolder
        lifterData={makeLifter({ best_snatch: undefined, 'best_c&j': undefined })}
        index={0}
        individualLiftsData={[individualLift]}
        sortType="total"
      />
    );

    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });

  test('B-11: the first-ranked card gets the gold current-record highlight', () => {
    const { container } = render(
      <RecordHolder lifterData={makeLifter()} index={0} individualLiftsData={[]} sortType="total" />
    );

    expect(container.querySelector('.record-viewer-record-holder')).toHaveClass(
      'record-viewer-record-current'
    );
  });

  test('B-11: lower-ranked cards are not highlighted', () => {
    const { container } = render(
      <RecordHolder lifterData={makeLifter()} index={1} individualLiftsData={[]} sortType="total" />
    );

    expect(container.querySelector('.record-viewer-record-holder')).not.toHaveClass(
      'record-viewer-record-current'
    );
  });

  test('B-10: shows the ranking number based on the index', () => {
    const { container } = render(
      <RecordHolder lifterData={makeLifter()} index={2} individualLiftsData={[]} sortType="total" />
    );

    expect(container.querySelector('.record-viewer-ranking')?.textContent).toBe('3');
  });

  test('B-13: the ranking number is hidden when sorted by most recent', () => {
    const { container } = render(
      <RecordHolder
        lifterData={makeLifter()}
        index={0}
        individualLiftsData={[]}
        sortType="lift_date"
      />
    );

    expect(container.querySelector('.record-viewer-ranking')).toBeNull();
  });

  test('B-12: the More Info link opens the lifter USAW page in a new tab', () => {
    render(
      <RecordHolder lifterData={makeLifter()} index={0} individualLiftsData={[]} sortType="total" />
    );

    const link = screen.getByRole('link', { name: 'More Info >>' });
    expect(link).toHaveAttribute(
      'href',
      'https://usaweightlifting.sport80.com/public/rankings/member/12345'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });
});
