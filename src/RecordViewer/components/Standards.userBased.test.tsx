import { render, screen } from '@testing-library/react';
import Standards from './Standards';
import { AgeGroupRecordSet, StandardRecord } from '../../Utils/types';

const makeRecord = (overrides: object = {}): StandardRecord => ({
  weight: '80',
  lifter: 'Jane Doe',
  event: 'Sacramento Open',
  date: '2026-01-15',
  ...overrides,
});

const makeRecordSet = (overrides: Record<string, StandardRecord> = {}): AgeGroupRecordSet => ({
  ageGroup: 'OPEN',
  weightClass: '48',
  records: {
    Total: makeRecord({ weight: '150' }),
    Snatch: makeRecord({ weight: '65' }),
    'Clean & Jerk': makeRecord({ weight: '85' }),
    ...overrides,
  },
});

describe('Standards (user-based)', () => {
  test('B-15: renders the title with the weight class and age group names', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet()}
        weightClassName="Women's 48kg"
        ageGroupName="Open"
      />
    );

    expect(
      screen.getByText("Officially Recognized Records & Standards for Women's 48kg Open:")
    ).toBeInTheDocument();
  });

  test('B-15: renders Total, Snatch, and Clean & Jerk standard sections', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet()}
        weightClassName="Women's 48kg"
        ageGroupName="Open"
      />
    );

    expect(screen.getByRole('heading', { name: 'Total' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Snatch' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clean & Jerk' })).toBeInTheDocument();
    expect(screen.getByText('150kg')).toBeInTheDocument();
    expect(screen.getByText('65kg')).toBeInTheDocument();
    expect(screen.getByText('85kg')).toBeInTheDocument();
  });

  test('B-15: a real record shows its event and date', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet()}
        weightClassName="Women's 48kg"
        ageGroupName="Open"
      />
    );

    expect(screen.getAllByText('Sacramento Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-01-15').length).toBeGreaterThan(0);
  });

  test('B-15: STANDARD placeholders hide the event and date', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet({
          Total: makeRecord({ lifter: 'STANDARD', event: 'Hidden Event', date: '2020-01-01' }),
          Snatch: makeRecord({ lifter: 'STANDARD', event: 'Hidden Event', date: '2020-01-01' }),
          'Clean & Jerk': makeRecord({
            lifter: 'STANDARD',
            event: 'Hidden Event',
            date: '2020-01-01',
          }),
        })}
        weightClassName="Women's 48kg"
        ageGroupName="Open"
      />
    );

    expect(screen.getAllByText('STANDARD')).toHaveLength(3);
    expect(screen.queryByText('Hidden Event')).toBeNull();
    expect(screen.queryByText('2020-01-01')).toBeNull();
  });

  test('B-15: renders the fine print explaining STANDARD placeholders', () => {
    render(<Standards weightClassName="Women's 48kg" ageGroupName="Open" />);

    expect(screen.getByText(/Something missing\?/)).toBeInTheDocument();
    // Loose match; the source copy contains known typos.
    expect(screen.getByText(/When the recordholder is "STANDARD"/)).toBeInTheDocument();
    expect(screen.getByText(/The 2026 standard is 85%/)).toBeInTheDocument();
  });

  test('B-15: no standard cards render without records', () => {
    render(<Standards weightClassName="Women's 48kg" ageGroupName="Open" />);

    expect(screen.queryByRole('heading', { name: 'Total' })).toBeNull();
  });
});
