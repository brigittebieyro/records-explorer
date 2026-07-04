import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';

describe('Header (user-based)', () => {
  test('A-01: renders the WSO logo and header text', () => {
    render(<Header />);

    const logo = screen.getByAltText('WSO logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/WSOLogo.png');
    expect(screen.getByText(/California North Central WSO Records & Results/)).toBeInTheDocument();
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

  test('A-02: the flyout menu contains exactly 6 links', () => {
    const { container } = render(<Header />);

    expect(container.querySelectorAll('.menu-flyout a')).toHaveLength(6);
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
      'https://canorthcentralwso.org/meet-schedule'
    );
    expect(screen.getByRole('link', { name: 'Official WSO Site' })).toHaveAttribute(
      'href',
      'https://canorthcentralwso.org'
    );
  });

  test('A-05: the hidden /scripts route is not linked anywhere in the menu', () => {
    const { container } = render(<Header />);

    expect(container.querySelector('a[href="/scripts"]')).toBeNull();
  });
});
