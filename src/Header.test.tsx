import { fireEvent, render, screen } from '@testing-library/react';
import Header from './Header';

jest.mock('./RoutesAndSettings', () => ({
  wsoName: 'TestOrg',
}));

describe('Header', () => {
  describe('Static Content', () => {
    test('renders the WSO logo image', () => {
      render(<Header />);
      expect(screen.getByAltText('WSO logo')).toBeInTheDocument();
    });

    test('renders the WSO name in the page header', () => {
      render(<Header />);
      expect(screen.getByText(/TestOrg WSO Records Explorer/)).toBeInTheDocument();
    });

    test('renders the records explorer home link', () => {
      render(<Header />);
      const link = screen.getByText('WSO Records Explorer').closest('a');
      expect(link).toHaveAttribute('href', '/');
    });

    test('renders the info page link', () => {
      render(<Header />);
      const link = screen.getByText('How Records Work').closest('a');
      expect(link).toHaveAttribute('href', '/info');
    });

    test('renders the meet schedule link', () => {
      render(<Header />);
      expect(screen.getByText('Local Meet Schedule')).toBeInTheDocument();
    });
  });

  describe('Menu Toggle', () => {
    test('menu flyout is hidden on initial render', () => {
      const { container } = render(<Header />);
      expect(container.querySelector('.menu-flyout')).toHaveClass('hidden');
    });

    test('clicking the menu icon shows the flyout', () => {
      const { container } = render(<Header />);
      fireEvent.click(container.querySelector('.menu-icon')!);
      expect(container.querySelector('.menu-flyout')).not.toHaveClass('hidden');
    });

    test('clicking the menu icon again hides the flyout', () => {
      const { container } = render(<Header />);
      const menuIcon = container.querySelector('.menu-icon')!;
      fireEvent.click(menuIcon);
      fireEvent.click(menuIcon);
      expect(container.querySelector('.menu-flyout')).toHaveClass('hidden');
    });
  });
});
