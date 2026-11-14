import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdaptiveRecords from './AdaptiveRecords';
import { adaptiveOptInFormUrl } from '../Data/RoutesAndSettings';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

// undefined means "as configured"; null stands for a setting the config leaves out.
let mockOptInFormUrl: string | null | undefined;
let mockAllRecordsSheetName: string | null | undefined;
let mockMissingAdaptiveConfigs: string[] | undefined;
let mockAdaptiveCategories: unknown[] | undefined;
jest.mock('../Data/RoutesAndSettings', () => {
  const actual = jest.requireActual('../Data/RoutesAndSettings');
  const configured = (mock: string | null | undefined, real: unknown) =>
    mock === undefined ? real : (mock ?? undefined);
  return {
    ...actual,
    get adaptiveOptInFormUrl() {
      return configured(mockOptInFormUrl, actual.adaptiveOptInFormUrl);
    },
    get adaptiveAllRecordsSheetName() {
      return configured(mockAllRecordsSheetName, actual.adaptiveAllRecordsSheetName);
    },
    get missingAdaptiveConfigs() {
      return mockMissingAdaptiveConfigs ?? actual.missingAdaptiveConfigs;
    },
    get adaptiveCategories() {
      return mockAdaptiveCategories ?? actual.adaptiveCategories;
    },
  };
});

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
const withRecord = (womensHolder: string, mensHolder = 'Jim Brown') => [
  sheetHeader,
  row('Open', 'F', '69', '77', 'Snatch', '70', womensHolder),
  row('Open', 'M', '75', '85', 'Snatch', '120', mensHolder),
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
 * category has been applied. The preamble shows while the combined tab is still loading, so the
 * page has settled once the preamble is up and the loader is gone.
 */
const landing = async () => {
  const preamble = await screen.findByText(/Keeping track of local adaptive athletes/);
  await waitFor(() => {
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });
  return preamble;
};

describe('AdaptiveRecords (user-based)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    mockOptInFormUrl = undefined;
    mockAllRecordsSheetName = undefined;
    mockMissingAdaptiveConfigs = undefined;
    mockAdaptiveCategories = undefined;
  });

  test('with no opt-in form configured, the page leaves out the opt-in paragraph', async () => {
    mockOptInFormUrl = null;
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'this form' })).toBeNull();
    expect(screen.queryByText(/to opt-in to having your results tracked/)).toBeNull();
  });

  test('with no combined tab configured, the page opens without fetching and still lists a category', async () => {
    mockAllRecordsSheetName = null;
    const fetchMock = mockSheets({ Adaptive_Vision: withRecord('Jane V. Smith') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await chooseCategory('Visual Impairment');
    expect(await screen.findByText('Jane V. Smith')).toBeInTheDocument();
  });

  test('opens on the preamble, listing no records until a category is applied', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    // Records are per-category: there is no combined listing to land on.
    expect(screen.queryByText('All Adaptive Record Holders')).toBeNull();
    expect(screen.queryByText('Jane Smith')).toBeNull();
    expect(screen.queryByTestId('circle-loader')).toBeNull();
  });

  test('shows its own description rather than the home page fine print', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

    render(<AdaptiveRecords />);

    expect(await screen.findByText(/Keeping track of local adaptive athletes/)).toBeInTheDocument();
    expect(screen.queryByText(/85% of the national record standard/)).toBeNull();
  });

  test('renders the opt-in form as a working link, not escaped markup', async () => {
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

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
      Adaptive_All: withRecord('Jane Smith'),
      Adaptive_Vision: [
        ...withRecord('Jane V. Smith'),
        row('Open', 'F', '77', '86', 'Snatch', '0', 'STANDARD'),
      ],
    });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Visual Impairment');

    await screen.findByText('Jane V. Smith');
    expect(screen.queryByText('STANDARD')).toBeNull();
  });

  test('says so plainly when a category holds only standards, instead of hanging on the loader', async () => {
    mockSheets({
      Adaptive_All: withRecord('Jane Smith'),
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
      Adaptive_All: withRecord('Jane Smith'),
      Adaptive_Vision: withRecord('Jane V. Smith'),
    });

    render(<AdaptiveRecords />);
    await landing();
    const fetchesOnLoad = fetchMock.mock.calls.length;
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Visual Impairment');

    // Armed, but the view has not moved and no request went out yet.
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    expect(screen.queryByText('Jane V. Smith')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(fetchesOnLoad);
  });

  test('choosing a category and pressing Go loads that category sheet', async () => {
    const fetchMock = mockSheets({
      Adaptive_All: withRecord('Jane Smith'),
      Adaptive_Vision: withRecord('Jane V. Smith'),
    });

    render(<AdaptiveRecords />);
    await landing();

    await chooseCategory('Visual Impairment');

    expect(await screen.findByText('Jane V. Smith')).toBeInTheDocument();
    expect(screen.getByText('Visual Impairment Record Holders')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('Adaptive_Vision'))).toBe(
      true
    );
  });

  test('the Reset button appears only once a category is chosen, and returns to the preamble', async () => {
    mockSheets({
      Adaptive_All: withRecord('Jane Smith'),
      Adaptive_Physical: withRecord('Jane P. Smith'),
    });

    render(<AdaptiveRecords />);
    await landing();
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();

    await chooseCategory('Physical Disability');
    await screen.findByText('Jane P. Smith');
    const reset = screen.getByRole('button', { name: 'Reset' });

    await userEvent.click(reset);

    await waitFor(() => {
      expect(screen.queryByText('Jane P. Smith')).toBeNull();
    });
    expect(screen.getByText(/Keeping track of local adaptive athletes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  test('returning to an already-viewed category refetches nothing', async () => {
    const fetchMock = mockSheets({
      Adaptive_All: withRecord('Jane Smith'),
      Adaptive_Hearing: withRecord('Jane H. Smith'),
    });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Deaf, Deafened, or Hard of Hearing');
    await screen.findByText('Jane H. Smith');
    const fetchesAfterFirstView = fetchMock.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => {
      expect(screen.queryByText('Jane H. Smith')).toBeNull();
    });
    await chooseCategory('Deaf, Deafened, or Hard of Hearing');

    expect(await screen.findByText('Jane H. Smith')).toBeInTheDocument();
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

  test('the preamble still shows when the combined tab fails to load', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    render(<AdaptiveRecords />);

    await waitFor(() => {
      expect(screen.getByText(/Adaptive records could not be loaded/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Keeping track of local adaptive athletes/)).toBeInTheDocument();
  });

  test('with no category tabs configured, the page shows an empty dropdown and its preamble', async () => {
    mockAdaptiveCategories = [];
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    const select = screen.getByLabelText('Category');
    // Only the placeholder remains.
    expect(select.querySelectorAll('option:not([value=""])')).toHaveLength(0);
  });

  test('lists missing adaptive settings below the preamble', async () => {
    mockMissingAdaptiveConfigs = ['adaptiveAllRecordsSheetName', 'adaptiveOptInFormUrl'];
    mockSheets({});

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    expect(
      screen.getByText(
        'Adaptive configs are missing: adaptiveAllRecordsSheetName, adaptiveOptInFormUrl'
      )
    ).toBeInTheDocument();
  });

  test('says nothing about missing settings when every one is configured', async () => {
    mockMissingAdaptiveConfigs = [];
    mockSheets({ Adaptive_All: withRecord('Jane Smith') });

    render(<AdaptiveRecords />);

    expect(await landing()).toBeInTheDocument();
    expect(screen.queryByText(/Adaptive configs are missing/)).toBeNull();
  });

  test('the missing settings message is not shown once a category is applied', async () => {
    mockMissingAdaptiveConfigs = ['adaptiveOptInFormUrl'];
    mockSheets({ Adaptive_Vision: withRecord('Jane V. Smith') });

    render(<AdaptiveRecords />);
    await landing();
    await chooseCategory('Visual Impairment');

    await screen.findByText('Jane V. Smith');
    expect(screen.queryByText(/Adaptive configs are missing/)).toBeNull();
  });
});
