import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import LocalMeets from './LocalMeets';
import * as Utils from '../Utils/Utils';
import { LocalMeet, MeetResult } from '../Utils/types';

jest.mock('../Data/RoutesAndSettings', () => ({
  getMeetsRoute: () => '/api/local-meets/data/new/1?p=0&i=200&s=&l=&d=10&f=',
  getLocalMeetByNameRoute: (meetName: string) => `/api/meet-search?s=${meetName}`,
  getIndividualMeetResultsRoute: (eventId: string) => `/api/meet-results/${eventId}/table/data`,
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-api-token': 'test-token',
  },
  localMeetStartDate: '2026-01-01',
  wsoRegion: '66',
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
    lifter: 'Jane Doe',
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

describe('LocalMeets (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(true);
  });

  describe('C-01: loading the meet list', () => {
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
      expect(String(body.get('event_to_date'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(options.headers).not.toHaveProperty('content-type');
    });

    test('shows the empty message when no meets are inside the boundary', async () => {
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(false);
      mockFetchResponses();

      renderLocalMeets();

      await waitFor(() => {
        expect(
          screen.getByText('No recent meets found within the WSO boundaries.')
        ).toBeInTheDocument();
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
