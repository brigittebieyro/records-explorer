import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordListForWeightClass from './RecordListForWeightClass';
import { AgeGroup, StandardRecord, WeightClass } from '../../Utils/types';

const makeAgeGroup = (overrides: object = {}): AgeGroup =>
  ({
    id: 'OPEN',
    name: 'Open',
    usawDisplayKey: 'Open',
    certificateDisplayKey: 'Open',
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

describe('RecordListForWeightClass print certificate link (user-based)', () => {
  // The print button posts and opens a blob URL; jsdom has none of that machinery.
  let certificateFetch: jest.Mock;

  const printPayload = async (index = 0, total = 1): Promise<Record<string, string>> => {
    // The label becomes "Printing…" mid-flight, so a button drops out of this query while it is
    // working. Wait for the whole set to settle before clicking, or the indices shift underfoot.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^print$/i })).toHaveLength(total)
    );
    certificateFetch.mockClear();
    await userEvent.click(screen.getAllByRole('button', { name: /^print$/i })[index]!);
    await waitFor(() => expect(certificateFetch).toHaveBeenCalled());
    const { body } = certificateFetch.mock.calls[certificateFetch.mock.calls.length - 1][1];
    return JSON.parse(body);
  };

  beforeEach(() => {
    certificateFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['%PDF-'], { type: 'application/pdf' }),
    });
    global.fetch = certificateFetch as unknown as typeof fetch;
    window.open = jest.fn().mockReturnValue({ location: { href: '' }, close: jest.fn() });
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const groups = [
    {
      ageGroup: makeAgeGroup(),
      records: { Snatch: makeRecord(), 'Clean & Jerk': makeRecord(), Total: makeRecord() },
    },
  ];

  test('B-31: no link renders unless a certificate sheet is named', () => {
    // The home page's all-records list omits the prop, so it is unchanged.
    render(<RecordListForWeightClass weightClass={makeWeightClass()} groups={groups} />);

    expect(screen.queryByRole('button', { name: /^print$/i })).toBeNull();
  });

  test('BA-10: naming a sheet opts the list into print links', async () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass()}
        groups={groups}
        certificateSheet="Adaptive_Physical"
      />
    );

    expect(screen.getAllByRole('button', { name: /^print$/i })).toHaveLength(3);
    const payload = await printPayload(0, 3);
    expect(payload.sheet).toBe('Adaptive_Physical');
    expect(payload.ageGroup).toBe('OPEN');
    expect(payload.gender).toBe('female');
    expect(payload.weightClass).toBe('48');
  });

  test('BA-10: the open-ended top class prints its > indicator', async () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass({ minBodyweight: '86', maxBodyweight: '1000' })}
        groups={groups}
        certificateSheet="Adaptive_All"
      />
    );

    expect((await printPayload(0, 3)).weightClass).toBe('>86');
  });

  test('BA-10: only lifts that have a record get a button', async () => {
    render(
      <RecordListForWeightClass
        weightClass={makeWeightClass()}
        groups={[{ ageGroup: makeAgeGroup(), records: { Snatch: makeRecord() } }]}
        certificateSheet="Adaptive_All"
      />
    );

    expect(screen.getAllByRole('button', { name: /^print$/i })).toHaveLength(1);
    expect((await printPayload()).lift).toBe('Snatch');
  });
});
