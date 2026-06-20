import { render, screen } from '@testing-library/react';
import AssociatedPriorRecords from './AssociatedPriorRecords';
import { PriorRecord } from '../../Utils/types';

const makeRecord = (overrides: Partial<PriorRecord> = {}): PriorRecord => ({
  ageGroup: 'OPEN',
  gender: 'female',
  ageMin: 15,
  ageMax: 999,
  bodyWeightMin: 36,
  bodyWeightMax: 48,
  lift: 'Total',
  weight: '210',
  lifter: 'Jane Smith',
  date: '2022-03-15',
  event: 'Nationals',
  yearSpan: '2018 - 2025',
  ...overrides,
});

describe('AssociatedPriorRecords', () => {
  test('renders nothing when records array is empty', () => {
    const { container } = render(<AssociatedPriorRecords records={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders section heading when records are present', () => {
    render(<AssociatedPriorRecords records={[makeRecord()]} />);
    expect(screen.getByText('Records from prior weight classes')).toBeInTheDocument();
  });

  test('renders each record as a list item', () => {
    const records = [
      makeRecord({ lift: 'Total', date: '2022-03-15' }),
      makeRecord({ lift: 'Snatch', weight: '95', date: '2021-06-10' }),
    ];
    render(<AssociatedPriorRecords records={records} />);
    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText(/Snatch/)).toBeInTheDocument();
  });

  test('shows "Women\'s" for female records', () => {
    render(<AssociatedPriorRecords records={[makeRecord({ gender: 'female' })]} />);
    expect(screen.getByText(/Women's/)).toBeInTheDocument();
  });

  test('shows "Men\'s" for male records', () => {
    render(<AssociatedPriorRecords records={[makeRecord({ gender: 'male' })]} />);
    expect(screen.getByText(/Men's/)).toBeInTheDocument();
  });

  test('renders yearSpan, bodyWeightMax, lift, weight, lifter, date, and event', () => {
    render(<AssociatedPriorRecords records={[makeRecord()]} />);
    expect(screen.getByText(/2018 - 2025/)).toBeInTheDocument();
    expect(screen.getByText(/48kg/)).toBeInTheDocument();
    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText(/210kg - Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/2022-03-15/)).toBeInTheDocument();
    expect(screen.getByText(/Nationals/)).toBeInTheDocument();
  });
});
