import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import LocalMeets from './LocalMeets';
import * as Settings from '../Data/RoutesAndSettings';
import * as Utils from '../Utils/Utils';
import { LocalMeet, MeetResult } from '../Utils/types';

jest.mock('../Data/RoutesAndSettings', () => ({
  __esModule: true,
  getMeetsRoute: () => '/api/local-meets/data/new/1?p=0&i=200&s=&l=&d=10&f=',
  getLocalMeetByNameRoute: (meetName: string) => `/api/meet-search?s=${meetName}`,
  getIndividualMeetResultsRoute: (eventId: string) => `/api/meet-results/${eventId}/table/data`,
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-api-token': 'test-token',
  },
  localMeetStartDate: '2026-01-01',
  wsoRegions: ['66'],
  wsoStateNames: ['California'],
  wsoBoundary: { north: 42.01, south: 34.79, west: -124.41, east: -114.13 },
  toRecordDate: () => '2026-06-15',
}));

jest.mock('../Utils/Utils', () => ({
  handleError: jest.fn(),
  isWithinWSOBoundary: jest.fn(),
}));

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

jest.mock('./LocalMeetResultsByWeightClass', () => (props: { meetResults: MeetResult[] }) => (
  <div data-testid="meet-results" data-count={props.meetResults.length} />
));

const makeMeet = (overrides: object = {}): LocalMeet =>
  ({
    id: '1',
    is_event: true,
    name: 'Sacramento Open',
    subtitle: '2026-03-01 - 2026-03-02',
    subtitle_icon: '',
    address: '123 Main St, Sacramento, California, 95814',
    geolocation: { lat: 38.5, lng: -121.5 },
    telephone: '',
    email: '',
    info: '',
    actions: [],
    img_url: '',
    ...overrides,
  }) as LocalMeet;

const makeResult = (overrides: object = {}): MeetResult =>
  ({
    age_category: "Open Women's 59kg",
    'best_c&j': 100,
    best_snatch: 80,
    'body_weight_(kg)': 58.4,
    date: '2026-03-01',
    lifter: 'Jane Smith',
    meet: 'Sacramento Open',
    total: 180,
    ...overrides,
  }) as unknown as MeetResult;

// Routes results by URL: the meets list, the meet-name search, and meet results.
const mockFetchResponses = ({
  meets = [makeMeet()],
  searchResults = [
    {
      meet: 'Sacramento Open',
      date: '2026-03-01',
      results: 42,
      action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/results/9876' }],
    },
  ],
  meetResults = [makeResult()],
}: {
  meets?: LocalMeet[];
  searchResults?: object[];
  meetResults?: MeetResult[];
} = {}) => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    const target = String(url);
    let data: unknown = meets;
    if (target.includes('meet-search')) data = searchResults;
    if (target.includes('meet-results')) data = meetResults;
    return Promise.resolve({ ok: true, json: async () => ({ data }) });
  });
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const renderLocalMeets = (initialEntry = '/local-meet-results') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocalMeets />
      <LocationProbe />
    </MemoryRouter>
  );

// Meet names appear in both the dropdown and the clickable list; scope to the list.
const waitForMeetList = async () => {
  await waitFor(() => {
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
  return screen.getByRole('list');
};

const clickMeetInList = async (name: string) => {
  const list = await waitForMeetList();
  await userEvent.click(within(list).getByText(name));
};

// The settings mock is a plain object, so a test can swap a setting and beforeEach restores it.
const mockedSettings = Settings as unknown as Record<string, unknown>;
const defaultSettings = { ...mockedSettings };

describe('LocalMeets (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockedSettings, defaultSettings);
    global.fetch = jest.fn();
    jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(true);
  });

  describe('C-01: loading the meet list', () => {
    test('with no localMeetStartDate, the page says local meets are not set up and fetches nothing', () => {
      mockedSettings.localMeetStartDate = undefined;
      renderLocalMeets();

      expect(screen.getByText('Local Meet Results')).toBeInTheDocument();
      expect(
        screen.getByText('Local meet results are not set up for this site.')
      ).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('shows the page title and a spinner while meets load', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderLocalMeets();

      expect(screen.getByText('Local Meet Results')).toBeInTheDocument();
      expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    });

    test('lists meets with name, date, and city, sorted newest first', async () => {
      mockFetchResponses({
        meets: [
          makeMeet({ id: '1', name: 'February Meet', subtitle: '2026-02-01 - 2026-02-02' }),
          makeMeet({ id: '2', name: 'March Meet', subtitle: '2026-03-01 - 2026-03-02' }),
        ],
      });

      renderLocalMeets();

      const list = await waitForMeetList();
      const items = within(list).getAllByRole('button');
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('March Meet');
      expect(items[0].textContent).toContain('2026-03-01 - 2026-03-02');
      expect(items[0].textContent).toContain('Sacramento, California');
      expect(items[1].textContent).toContain('February Meet');
    });

    test('filters out meets outside the WSO boundary', async () => {
      jest.mocked(Utils.isWithinWSOBoundary).mockImplementation((lat: number) => lat > 34.79);
      mockFetchResponses({
        meets: [
          makeMeet({ id: '1', name: 'Inside Meet', geolocation: { lat: 38.5, lng: -121.5 } }),
          makeMeet({ id: '2', name: 'Outside Meet', geolocation: { lat: 32.7, lng: -117.1 } }),
        ],
      });

      renderLocalMeets();

      const list = await waitForMeetList();
      expect(within(list).getByText('Inside Meet')).toBeInTheDocument();
      expect(screen.queryByText('Outside Meet')).toBeNull();
    });

    test('sends the meet search window as multipart form data', async () => {
      mockFetchResponses({ meets: [] });

      renderLocalMeets();

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe('POST');
      const body = options.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect(body.get('event_from_date')).toBe('2026-01-01');
      expect(body.get('region')).toBe('66');
      // Today, as the record time zone has it.
      expect(body.get('event_to_date')).toBe('2026-06-15');
      expect(options.headers).not.toHaveProperty('content-type');
    });

    test('requests each region and lists their meets together, once each, newest first', async () => {
      mockedSettings.wsoRegions = ['66', '67'];
      (global.fetch as jest.Mock).mockImplementation((_url: string, options: RequestInit) => {
        const region = (options.body as FormData).get('region');
        const data =
          region === '66'
            ? [
                makeMeet({ id: '1', name: 'February Meet', subtitle: '2026-02-01 - 2026-02-02' }),
                makeMeet({ id: '3', name: 'Shared Meet', subtitle: '2026-01-10 - 2026-01-10' }),
              ]
            : [
                makeMeet({ id: '2', name: 'March Meet', subtitle: '2026-03-01 - 2026-03-02' }),
                makeMeet({ id: '3', name: 'Shared Meet', subtitle: '2026-01-10 - 2026-01-10' }),
              ];
        return Promise.resolve({ ok: true, json: async () => ({ data }) });
      });

      renderLocalMeets();

      const list = await waitForMeetList();
      const regions = (global.fetch as jest.Mock).mock.calls.map(([, options]) =>
        (options.body as FormData).get('region')
      );
      expect(regions).toEqual(['66', '67']);
      const items = within(list).getAllByRole('button');
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toContain('March Meet');
      expect(items[1].textContent).toContain('February Meet');
      expect(items[2].textContent).toContain('Shared Meet');
    });

    test('shows the error message when any region request fails', async () => {
      mockedSettings.wsoRegions = ['66', '67'];
      (global.fetch as jest.Mock).mockImplementation((_url: string, options: RequestInit) => {
        const ok = (options.body as FormData).get('region') === '66';
        return Promise.resolve({ ok, json: async () => ({ data: [makeMeet()] }) });
      });

      renderLocalMeets();

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load meets. Please try again later.')
        ).toBeInTheDocument();
      });
    });

    test('with no boundary, lists every meet, including ones with no geolocation', async () => {
      mockedSettings.wsoBoundary = undefined;
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(false);
      mockFetchResponses({
        meets: [
          makeMeet({ id: '1', name: 'Located Meet', geolocation: { lat: 32.7, lng: -117.1 } }),
          makeMeet({ id: '2', name: 'Unlocated Meet', geolocation: null }),
        ],
      });

      renderLocalMeets();

      const list = await waitForMeetList();
      expect(within(list).getByText('Located Meet')).toBeInTheDocument();
      expect(within(list).getByText('Unlocated Meet')).toBeInTheDocument();
    });

    test('shows the city for whichever listed state the address names', async () => {
      mockedSettings.wsoStateNames = ['California', 'Nevada'];
      mockFetchResponses({
        meets: [
          makeMeet({ id: '1', name: 'Reno Meet', address: '1 Virginia St, Reno, Nevada, 89501' }),
          makeMeet({
            id: '2',
            name: 'Elsewhere Meet',
            address: '1 Main St, Portland, Oregon, 97201',
          }),
        ],
      });

      renderLocalMeets();

      const list = await waitForMeetList();
      expect(within(list).getByText('Reno, Nevada')).toBeInTheDocument();
      const elsewhere = within(list).getByRole('button', { name: /Elsewhere Meet/ });
      expect(elsewhere.textContent).not.toContain('Portland');
      expect(elsewhere.textContent).not.toContain('•');
    });

    test('shows the empty message when no meets are inside the boundary', async () => {
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(false);
      mockFetchResponses();

      renderLocalMeets();

      await waitFor(() => {
        expect(screen.getByText('No recent local meets found.')).toBeInTheDocument();
      });
    });
  });

  describe('G-03: meet list failures', () => {
    test('shows an error message when the fetch rejects', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('proxy down'));

      renderLocalMeets();

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load meets. Please try again later.')
        ).toBeInTheDocument();
      });
    });

    test('shows an error message when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      renderLocalMeets();

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load meets. Please try again later.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('C-02 / C-03 / C-04: selecting a meet', () => {
    test('C-02: choosing a meet in the dropdown and clicking Go loads results', async () => {
      mockFetchResponses();

      renderLocalMeets();

      await waitFor(() => {
        expect(screen.getByLabelText('Meet')).toBeInTheDocument();
      });
      await userEvent.selectOptions(screen.getByLabelText('Meet'), '1');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() => {
        expect(screen.getByTestId('meet-results')).toBeInTheDocument();
      });
      expect(screen.getByTestId('meet-results')).toHaveAttribute('data-count', '1');
      const calledUrls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));
      expect(calledUrls.some((url) => url.includes('meet-search'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('meet-results/9876'))).toBe(true);
    });

    test('C-03: clicking a meet in the list loads the same results', async () => {
      mockFetchResponses();

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');

      await waitFor(() => {
        expect(screen.getByTestId('meet-results')).toBeInTheDocument();
      });
    });

    test('C-04: meet list items are keyboard-accessible buttons', async () => {
      mockFetchResponses();

      renderLocalMeets();

      const list = await waitForMeetList();
      const listItem = within(list).getByRole('button');
      expect(listItem).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(listItem, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('meet-results')).toBeInTheDocument();
      });
    });

    test('C-07: the Full Results link points at the USAW results page', async () => {
      mockFetchResponses();

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Full Results from USAW >>' })).toHaveAttribute(
          'href',
          'https://usaweightlifting.sport80.com/public/rankings/results/9876'
        );
      });
    });

    test('C-02: selecting a meet writes the meetId query param', async () => {
      mockFetchResponses();

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');

      await waitFor(() => {
        expect(screen.getByTestId('location-search')).toHaveTextContent('meetId=1');
      });
    });
  });

  describe('C-08: reset', () => {
    test('clears the selected meet, results, and meetId param', async () => {
      mockFetchResponses();

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');
      await waitFor(() => {
        expect(screen.getByTestId('meet-results')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

      await waitFor(() => {
        expect(screen.queryByTestId('meet-results')).toBeNull();
      });
      expect(screen.getByTestId('location-search').textContent).toBe('');
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('C-09 / G-05: meetId deep links', () => {
    test('C-09: a meetId param auto-loads that meet after the list arrives', async () => {
      mockFetchResponses();

      renderLocalMeets('/local-meet-results?meetId=1');

      await waitFor(() => {
        expect(screen.getByTestId('meet-results')).toBeInTheDocument();
      });
    });

    test('G-05: a bogus meetId is ignored without crashing', async () => {
      mockFetchResponses();

      renderLocalMeets('/local-meet-results?meetId=999999999');

      const list = await waitForMeetList();
      expect(within(list).getByText('Sacramento Open')).toBeInTheDocument();
      expect(screen.queryByTestId('meet-results')).toBeNull();
      // Only the meets-list fetch should have fired.
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('C-10: result failures and empty results', () => {
    test('shows the empty message when a meet has no results', async () => {
      mockFetchResponses({ meetResults: [] });

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');

      await waitFor(() => {
        expect(screen.getByText('No results found for this meet.')).toBeInTheDocument();
      });
    });

    test('shows an error message when the results fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        const target = String(url);
        if (target.includes('meet-search') || target.includes('meet-results')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, json: async () => ({ data: [makeMeet()] }) });
      });

      renderLocalMeets();

      await clickMeetInList('Sacramento Open');

      await waitFor(() => {
        expect(screen.getByText('Failed to load results. Please try again.')).toBeInTheDocument();
      });
    });
  });
});
