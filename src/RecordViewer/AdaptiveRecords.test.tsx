import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdaptiveRecords from './AdaptiveRecords';
import { adaptiveOptInFormUrl } from '../Data/RoutesAndSettings';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

const sheetHeader = [
  'federation',
  'recordName',
  'ageGroup',
  'gender',
  'ageMin',
  'ageMax',
  'bodyWeightMin',
  'bodyWeightMax',
  'lift',
  'record',
  'name',
  'date',
  'place',
];

const row = (
  ageGroup: string,
  gender: string,
  min: string,
  max: string,
  lift: string,
  record: string,
  holder: string
): string[] => [
  'Norcal',
  'California North Central',
  ageGroup,
  gender,
  '0',
  '1000',
  min,
  max,
  lift,
  record,
  holder,
  '2026-03-07',
  'Some Meet',
];

// Only rows whose weight class matches a real current class are rendered, so the bodyweight
// bounds here mirror Women's 77kg and Men's 85kg.
const withRecord = (holder: string) => [
  sheetHeader,
  row('Open', 'F', '69', '77', 'Snatch', '70', holder),
  row('Open', 'M', '75', '85', 'Snatch', '120', `${holder} Two`),
];

const standardsOnly = [
  sheetHeader,
  row('Open', 'F', '69', '77', 'Snatch', '0', 'STANDARD'),
  row('Open', 'M', '75', '85', 'Snatch', '0', 'STANDARD'),
];

const mockSheets = (bySheetName: Record<string, string[][]>) => {
  const fetchMock = jest.fn(async (url: string) => {
    const sheetName = Object.keys(bySheetName).find((name) => url.includes(name));
    return {
      ok: true,
      json: async () => ({ values: sheetName ? bySheetName[sheetName] : [] }),
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

// Same two-step as the home page: pick from the dropdown, then press Go.
const chooseCategory = async (label: string) => {
  await userEvent.selectOptions(screen.getByLabelText('Category'), label);
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
};

/**
 * The page opens on its preamble: records are per-category now, so nothing is listed until a
 * category has been applied. Waiting on the preamble is how a test knows the page has settled.
 */
const landing = () => screen.findByText(/Keeping track of local adaptive athletes/);

describe('AdaptiveRecords (user-based)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('opens on the preamble, listing no records until a category is applied', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Doe') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    // Records are per-category: there is no combined listing to land on.
    expect(screen.queryByText('All Adaptive Record Holders')).toBeNull();
    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });

  test('shows its own description rather than the home page fine print', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Doe') });

    render(<AdaptiveRecords />);

    expect(await screen.findByText(/Keeping track of local adaptive athletes/)).toBeInTheDocument();
    expect(screen.queryByText(/85% of the national record standard/)).toBeNull();
  });

  test('renders the opt-in form as a working link, not escaped markup', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Doe') });

    render(<AdaptiveRecords />);

    const link = await screen.findByRole('link', { name: 'this form' });
    expect(link).toHaveAttribute('href', adaptiveOptInFormUrl);
    expect(link).toHaveAttribute('target', '_blank');
    // A string of markup would have surfaced the tags as visible text.
    expect(screen.queryByText(/<a href/)).toBeNull();
    expect(screen.queryByText(/<br/)).toBeNull();
  });

  test('never lists a STANDARD placeholder as a record holder', async () => {
    // The real sheets carry exactly one row per slot, so the unclaimed standard sits in a
    // different weight class from the held record — here Women's 86kg beside Women's 77kg.
    mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Vision: [
        ...withRecord('Vision Holder'),
        row('Open', 'F', '77', '86', 'Snatch', '0', 'STANDARD'),
      ],
    });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Visual Impairment');

    await screen.findByText('Vision Holder');
    expect(screen.queryByText('STANDARD')).toBeNull();
  });

  test('says so plainly when a category holds only standards, instead of hanging on the loader', async () => {
    mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Vision: standardsOnly,
    });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Visual Impairment');

    expect(await screen.findByText('No adaptive records have been set yet.')).toBeInTheDocument();
    expect(screen.queryByText('Loading current records…')).toBeNull();
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });

  test('Go stays disabled until a category is picked, and nothing loads before it is pressed', async () => {
    const fetchMock = mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Vision: withRecord('Vision Holder'),
    });

    render(<AdaptiveRecords />);
    await landing();
    const fetchesOnLoad = fetchMock.mock.calls.length;
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Visual Impairment');

    // Armed, but the view has not moved and no request went out yet.
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    expect(screen.queryByText('Vision Holder')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchesOnLoad);
  });

  test('choosing a category and pressing Go loads that category sheet', async () => {
    const fetchMock = mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Vision: withRecord('Vision Holder'),
    });

    render(<AdaptiveRecords />);
    await landing();

    await chooseCategory('Visual Impairment');

    expect(await screen.findByText('Vision Holder')).toBeInTheDocument();
    expect(screen.getByText('Visual Impairment Record Holders')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('Adaptive_Vision'))).toBe(
      true
    );
  });

  test('the Reset button appears only once a category is chosen, and returns to the preamble', async () => {
    mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Physical: withRecord('Physical Holder'),
    });

    render(<AdaptiveRecords />);
    await landing();
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();

    await chooseCategory('Physical Disability');
    await screen.findByText('Physical Holder');
    const reset = screen.getByRole('button', { name: 'Reset' });

    await userEvent.click(reset);

    await waitFor(() => {
      expect(screen.queryByText('Physical Holder')).toBeNull();
    });
    expect(screen.getByText(/Keeping track of local adaptive athletes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  test('returning to an already-viewed category refetches nothing', async () => {
    const fetchMock = mockSheets({
      Adaptive_All: withRecord('Jane Doe'),
      Adaptive_Hearing: withRecord('Hearing Holder'),
    });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Deaf, Deafened, or Hard of Hearing');
    await screen.findByText('Hearing Holder');
    const fetchesAfterFirstView = fetchMock.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => {
      expect(screen.queryByText('Hearing Holder')).toBeNull();
    });
    await chooseCategory('Deaf, Deafened, or Hard of Hearing');

    expect(await screen.findByText('Hearing Holder')).toBeInTheDocument();
    // Every sheet on this path has been seen already, so nothing went back out.
    expect(fetchMock).toHaveBeenCalledTimes(fetchesAfterFirstView);
  });

  test('a failed fetch reports the problem rather than spinning forever', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    render(<AdaptiveRecords />);

    await waitFor(() => {
      expect(screen.getByText(/Adaptive records could not be loaded/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });
});
