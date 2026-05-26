import { render, screen, waitFor, within } from '@testing-library/react';
import LocalMeets from './LocalMeets';
import * as Utils from '../Utils/Utils';

const TEST_MEETS_URL = '/api/local-meets/data/new/1?p=0&i=20&s=&l=&d=10&f=';

jest.mock('../Data/RoutesAndSettings', () => ({
  getMeetsRoute: () => '/api/local-meets/data/new/1?p=0&i=20&s=&l=&d=10&f=',
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

const makeMeet = (overrides: object = {}) => ({
  id: '1',
  is_event: true,
  name: 'Sacramento Open',
  subtitle: '',
  subtitle_icon: '',
  address: '123 Main St',
  geolocation: { lat: 38.5, lng: -121.5 },
  telephone: '',
  email: '',
  info: '',
  actions: [],
  img_url: '',
  ...overrides,
});

describe('LocalMeets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Loading state', () => {
    test('shows spinner while fetch is in progress', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<LocalMeets />);

      expect(screen.getByTestId('circle-loader')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    test('renders meets that are within the WSO boundary', async () => {
      const meet = makeMeet({ id: '1', name: 'Sacramento Open' });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [meet] }),
      });
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(true);

      render(<LocalMeets />);

      await waitFor(() => {
        expect(screen.getAllByText('Sacramento Open')[0]).toBeInTheDocument();
      });
    });

    test('renders each local meet as a list item', async () => {
      const meets = [makeMeet({ id: '1', name: 'Meet A' }), makeMeet({ id: '2', name: 'Meet B' })];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: meets }),
      });
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(true);

      render(<LocalMeets />);

      await waitFor(() => {
        expect(screen.getAllByText('Meet A')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Meet B')[0]).toBeInTheDocument();
      });
      expect(within(screen.getByRole('list')).getAllByRole('button')).toHaveLength(2);
    });

    test('shows empty message when no meets are within the WSO boundary', async () => {
      const meet = makeMeet({ geolocation: { lat: 32.7, lng: -117.1 } });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [meet] }),
      });
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(false);

      render(<LocalMeets />);

      await waitFor(() => {
        expect(
          screen.getByText('No recent meets found within the WSO boundaries.')
        ).toBeInTheDocument();
      });
    });

    test('shows empty message when data array is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => {
        expect(
          screen.getByText('No recent meets found within the WSO boundaries.')
        ).toBeInTheDocument();
      });
    });

    test('excludes meets with null geolocation', async () => {
      const meets = [
        makeMeet({ id: '1', name: 'No Location Meet', geolocation: null }),
        makeMeet({ id: '2', name: 'Local Meet', geolocation: { lat: 38.5, lng: -121.5 } }),
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: meets }),
      });
      jest.mocked(Utils.isWithinWSOBoundary).mockReturnValue(true);

      render(<LocalMeets />);

      await waitFor(() => {
        expect(screen.getAllByText('Local Meet')[0]).toBeInTheDocument();
        expect(screen.queryByText('No Location Meet')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error state', () => {
    test('shows error message when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      render(<LocalMeets />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load meets. Please try again later.')
        ).toBeInTheDocument();
      });
    });

    test('shows error message when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<LocalMeets />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load meets. Please try again later.')
        ).toBeInTheDocument();
      });
    });

    test('calls handleError when fetch throws', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      render(<LocalMeets />);

      await waitFor(() => {
        expect(Utils.handleError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Fetch request', () => {
    test('sends a POST request to the meets endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          TEST_MEETS_URL,
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('sends event_from_date as 2026-01-01', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect((options.body as FormData).get('event_from_date')).toBe('2026-01-01');
    });

    test('sends region as 66', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect((options.body as FormData).get('region')).toBe('66');
    });

    test('sends event_to_date as a valid YYYY-MM-DD date', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const toDate = (options.body as FormData).get('event_to_date') as string;
      expect(toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('omits content-type header so the browser sets the multipart boundary', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<LocalMeets />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers).not.toHaveProperty('content-type');
    });
  });

  describe('Static content', () => {
    test('renders the section heading', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<LocalMeets />);

      expect(screen.getByText('Local Meet Results')).toBeInTheDocument();
    });
  });
});
