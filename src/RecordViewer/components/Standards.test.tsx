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

describe('Standards print certificate link (user-based)', () => {
  const withLinkProps = {
    weightClassName: "Women's 48kg",
    ageGroupName: 'Open',
    ageGroupId: 'OPEN',
    gender: 'female' as const,
    sheet: 'Post-Aug2026',
  };

  test('B-25: a real record holder gets a print certificate link', () => {
    render(<Standards relevantRecords={makeRecordSet()} {...withLinkProps} />);

    // One per lift.
    expect(screen.getAllByRole('link', { name: /^print$/i })).toHaveLength(3);
  });

  test('B-25: the link carries the lift it sits under', () => {
    render(<Standards relevantRecords={makeRecordSet()} {...withLinkProps} />);

    const hrefs = screen
      .getAllByRole('link', { name: /^print$/i })
      .map((a) => new URLSearchParams(a.getAttribute('href')!.split('?')[1]).get('lift'));
    expect(hrefs).toEqual(['Total', 'Snatch', 'Clean & Jerk']);
  });

  test('B-25: the link uses the record set weight class, not the age key', () => {
    // relevantRecords.ageGroup is the sheet's ageKey ('W35'), NOT the record key -- so the
    // ageGroup param must come from the prop instead.
    render(
      <Standards
        relevantRecords={{ ...makeRecordSet(), ageGroup: 'W35', weightClass: '>86' }}
        {...withLinkProps}
        ageGroupId="35"
      />
    );
    const params = new URLSearchParams(
      screen
        .getAllByRole('link', { name: /^print$/i })[0]!
        .getAttribute('href')!
        .split('?')[1]
    );
    expect(params.get('ageGroup')).toBe('35');
    expect(params.get('weightClass')).toBe('>86');
  });

  test('B-26: STANDARD placeholders get no print certificate link', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet({
          Total: makeRecord({ lifter: 'STANDARD' }),
          Snatch: makeRecord({ lifter: 'STANDARD' }),
          'Clean & Jerk': makeRecord({ lifter: 'STANDARD' }),
        })}
        {...withLinkProps}
      />
    );

    expect(screen.queryByRole('link', { name: /^print$/i })).toBeNull();
  });

  test('B-26: a mixed record set links only the real holders', () => {
    render(
      <Standards
        relevantRecords={makeRecordSet({ Snatch: makeRecord({ lifter: 'STANDARD' }) })}
        {...withLinkProps}
      />
    );

    expect(screen.getAllByRole('link', { name: /^print$/i })).toHaveLength(2);
  });

  test('no link renders when the certificate props are not supplied', () => {
    // The props are optional so existing callers are unaffected.
    render(
      <Standards
        relevantRecords={makeRecordSet()}
        weightClassName="Women's 48kg"
        ageGroupName="Open"
      />
    );

    expect(screen.queryByRole('link', { name: /^print$/i })).toBeNull();
  });

  test('a partial record set renders the lifts it has without crashing', () => {
    // records is a Record<string, StandardRecord>, so indexing is not type-checked and a missing
    // lift used to blow up on standardData.weight.
    render(
      <Standards
        relevantRecords={{ ageGroup: 'OPEN', weightClass: '48', records: { Snatch: makeRecord() } }}
        {...withLinkProps}
      />
    );

    expect(screen.getByText('80kg')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^print$/i })).toHaveLength(1);
  });
});
