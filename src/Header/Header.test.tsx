import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { localHomeUrl, localScheduleUrl, wsoDisplayName } from '../Data/RoutesAndSettings';

let mockShowAdaptiveRecordsInMenu = true;
jest.mock('../Data/RoutesAndSettings', () => ({
  ...jest.requireActual('../Data/RoutesAndSettings'),
  get showAdaptiveRecordsInMenu() {
    return mockShowAdaptiveRecordsInMenu;
  },
}));

beforeEach(() => {
  mockShowAdaptiveRecordsInMenu = true;
});

describe('Header (user-based)', () => {
  test('A-01: renders the WSO logo and header text', () => {
    render(<Header />);

    const logo = screen.getByAltText('WSO logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/WSOLogo.png');
    expect(
      screen.getByText(new RegExp(`${wsoDisplayName} WSO Records & Results`))
    ).toBeInTheDocument();
  });

  test('A-02: the menu icon toggles the flyout open and closed', async () => {
    const { container } = render(<Header />);

    const flyout = container.querySelector('.menu-flyout');
    const menuIcon = container.querySelector('.menu-icon');
    expect(flyout).not.toBeNull();
    expect(menuIcon).not.toBeNull();
    expect(flyout).toHaveClass('hidden');

    await userEvent.click(menuIcon as Element);
    expect(container.querySelector('.menu-flyout')).not.toHaveClass('hidden');

    await userEvent.click(menuIcon as Element);
    expect(container.querySelector('.menu-flyout')).toHaveClass('hidden');
  });

  test('A-02: the flyout menu contains exactly 7 links', () => {
    const { container } = render(<Header />);

    expect(container.querySelectorAll('.menu-flyout a')).toHaveLength(7);
  });

  test('A-02: with showAdaptiveRecordsInMenu off, the menu has no Adaptive WSO Records link', () => {
    mockShowAdaptiveRecordsInMenu = false;
    const { container } = render(<Header />);

    expect(container.querySelectorAll('.menu-flyout a')).toHaveLength(6);
    expect(container.querySelector('a[href="/adaptive"]')).toBeNull();
  });

  test('A-02: Adaptive WSO Records sits directly below WSO Records & Results', () => {
    const { container } = render(<Header />);
    const linkText = Array.from(container.querySelectorAll('.menu-flyout a')).map(
      (link) => link.textContent
    );

    expect(linkText.slice(0, 2)).toEqual(['WSO Records & Results', 'Adaptive WSO Records']);
  });

  test('A-03: the Adaptive WSO Records link points at /adaptive', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: 'Adaptive WSO Records' })).toHaveAttribute(
      'href',
      '/adaptive'
    );
  });

  test('A-03: internal navigation links point at the app routes', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: 'WSO Records & Results' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: 'Local Meet Results' })).toHaveAttribute(
      'href',
      '/local-meet-results'
    );
    expect(
      screen.getByRole('link', { name: 'Senior Nationals Qualification Rankings' })
    ).toHaveAttribute('href', '/goals');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/info');
  });

  test('A-04: external links point at the official WSO site', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: 'Local Meet Schedule' })).toHaveAttribute(
      'href',
      localScheduleUrl
    );
    expect(screen.getByRole('link', { name: 'Official WSO Site' })).toHaveAttribute(
      'href',
      localHomeUrl
    );
  });

  test('A-05: the hidden /scripts route is not linked anywhere in the menu', () => {
    const { container } = render(<Header />);

    expect(container.querySelector('a[href="/scripts"]')).toBeNull();
  });
});
