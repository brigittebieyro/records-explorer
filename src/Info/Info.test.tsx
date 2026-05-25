import { render, screen } from '@testing-library/react';
import Info from './Info';

jest.mock('../Data/RoutesAndSettings', () => ({
  americanRecordsUrl: 'https://test-american-records.example.com',
  wsoInfoUSAWUrl: 'https://test-wso-info.example.com',
  githubUrl: 'https://test-github.example.com',
  maintainerEmail: 'test@example.com',
  maintainerName: 'Test Maintainer',
}));

describe('Info', () => {
  describe('About Records section', () => {
    test('renders the About Records heading', () => {
      render(<Info />);
      expect(screen.getByRole('heading', { level: 2, name: 'About Records' })).toBeInTheDocument();
    });

    test('includes content about local records', () => {
      const { container } = render(<Info />);
      expect(container).toHaveTextContent('Local Records');
    });

    test('mentions the WSO committee', () => {
      const { container } = render(<Info />);
      expect(container).toHaveTextContent('WSO committee');
    });

    test('links to American records with correct href', () => {
      render(<Info />);
      const link = screen.getByText(/American national/).closest('a');
      expect(link).toHaveAttribute('href', 'https://test-american-records.example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('links to the WSO committee page with correct href', () => {
      render(<Info />);
      const link = screen.getByText('your WSO committee').closest('a');
      expect(link).toHaveAttribute('href', 'https://test-wso-info.example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('About This Site section', () => {
    test('renders the About This Site heading', () => {
      render(<Info />);
      expect(
        screen.getByRole('heading', { level: 2, name: 'About This Site' })
      ).toBeInTheDocument();
    });

    test('links to GitHub with correct href', () => {
      render(<Info />);
      const link = screen.getByText('GitHub').closest('a');
      expect(link).toHaveAttribute('href', 'https://test-github.example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('renders the maintainer name', () => {
      render(<Info />);
      expect(screen.getByText('Test Maintainer')).toBeInTheDocument();
    });

    test('links to maintainer email with correct mailto href', () => {
      render(<Info />);
      const link = screen.getByText('Test Maintainer').closest('a');
      expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    });
  });
});
