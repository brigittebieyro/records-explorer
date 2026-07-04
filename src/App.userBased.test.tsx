import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="circle-loader">Loading</div>,
}));

jest.mock('./Goals/Goals', () => () => <div data-testid="goals-page" />);

jest.mock('./LocalMeets/LocalMeets', () => () => <div data-testid="local-meets-page" />);

jest.mock('./Scripts/Scripts', () => () => <div data-testid="scripts-page" />);

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

const HEADER_TEXT = /California North Central WSO Records & Results/;

describe('App routing (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ values: [] }) });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  test('A-03: the root route renders the records viewer with the header', async () => {
    renderAt('/');

    expect(screen.getByText(HEADER_TEXT)).toBeInTheDocument();
    expect(screen.getByLabelText('Age Group')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Loading current records…')).toBeInTheDocument();
    });
  });

  test('A-03: /info renders the About page with the header', () => {
    renderAt('/info');

    expect(screen.getByText(HEADER_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About Records' })).toBeInTheDocument();
  });

  test('A-03: /local-meet-results renders the local meets page', () => {
    renderAt('/local-meet-results');

    expect(screen.getByText(HEADER_TEXT)).toBeInTheDocument();
    expect(screen.getByTestId('local-meets-page')).toBeInTheDocument();
  });

  test('A-03: /goals renders the qualification rankings page', () => {
    renderAt('/goals');

    expect(screen.getByText(HEADER_TEXT)).toBeInTheDocument();
    expect(screen.getByTestId('goals-page')).toBeInTheDocument();
  });

  test('/scripts resolves even though it is not linked in the menu', () => {
    renderAt('/scripts');

    expect(screen.getByTestId('scripts-page')).toBeInTheDocument();
  });

  test('G-06: an unknown route renders the header with an empty body', () => {
    renderAt('/does-not-exist');

    expect(screen.getByText(HEADER_TEXT)).toBeInTheDocument();
    expect(screen.queryByTestId('goals-page')).toBeNull();
    expect(screen.queryByTestId('local-meets-page')).toBeNull();
    expect(screen.queryByTestId('scripts-page')).toBeNull();
    expect(screen.queryByLabelText('Age Group')).toBeNull();
  });
});
