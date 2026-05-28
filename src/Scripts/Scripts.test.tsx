import { fireEvent, render, screen } from '@testing-library/react';
import Scripts from './Scripts';

function getPasswordInput() {
  return document.querySelector('input[type="password"]') as HTMLInputElement;
}

jest.mock('../Data/scripts', () => ({
  scripts: [
    {
      name: 'Test Script',
      source: jest.fn().mockResolvedValue('col1,col2\nval1,val2\n'),
      description: 'A test script description.',
    },
  ],
}));

jest.mock('../Data/RoutesAndSettings', () => ({
  scriptsPassword: 'pineapple',
}));

describe('Scripts', () => {
  describe('Static content', () => {
    test('renders the Scripts heading', () => {
      render(<Scripts />);
      expect(screen.getByRole('heading', { level: 2, name: 'Scripts' })).toBeInTheDocument();
    });

    test('renders the description box', () => {
      const { container } = render(<Scripts />);
      expect(container).toHaveTextContent('WSO Committee members');
    });

    test('renders the script selector dropdown', () => {
      render(<Scripts />);
      expect(screen.getByRole('combobox', { name: 'Script' })).toBeInTheDocument();
    });

    test('renders the Run button', () => {
      render(<Scripts />);
      expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    });
  });

  describe('Locked state', () => {
    test('dropdown is disabled on initial load', () => {
      render(<Scripts />);
      expect(screen.getByRole('combobox', { name: 'Script' })).toBeDisabled();
    });

    test('Run button is disabled on initial load', () => {
      render(<Scripts />);
      expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
    });

    test('password input is visible on initial load', () => {
      render(<Scripts />);
      expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    });

    test('script options are not populated while locked', () => {
      render(<Scripts />);
      expect(screen.queryByText('Test Script')).not.toBeInTheDocument();
    });
  });

  describe('Password entry', () => {
    test('shows an error message for an incorrect password', () => {
      render(<Scripts />);
      fireEvent.change(getPasswordInput(), {
        target: { value: 'wrongpassword' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
      expect(screen.getByText(/Incorrect password/)).toBeInTheDocument();
    });

    test('clears the error message when the input changes after a failed attempt', () => {
      render(<Scripts />);
      const input = getPasswordInput();
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
      fireEvent.change(input, { target: { value: 'w' } });
      expect(screen.queryByText(/Incorrect password/)).not.toBeInTheDocument();
    });

    test('accepts the correct password via the Go button', () => {
      render(<Scripts />);
      fireEvent.change(getPasswordInput(), {
        target: { value: 'pineapple' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
      expect(screen.queryByRole('button', { name: 'Go' })).not.toBeInTheDocument();
    });

    test('accepts the correct password via the Enter key', () => {
      render(<Scripts />);
      const input = getPasswordInput();
      fireEvent.change(input, { target: { value: 'pineapple' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.queryByRole('button', { name: 'Go' })).not.toBeInTheDocument();
    });
  });

  describe('Unlocked state', () => {
    function unlock() {
      render(<Scripts />);
      fireEvent.change(getPasswordInput(), {
        target: { value: 'pineapple' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    }

    test('dropdown is enabled after correct password', () => {
      unlock();
      expect(screen.getByRole('combobox', { name: 'Script' })).not.toBeDisabled();
    });

    test('script options are populated after unlock', () => {
      unlock();
      expect(screen.getByText('Test Script')).toBeInTheDocument();
    });

    test('Run button remains disabled before a script is selected', () => {
      unlock();
      expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
    });

    test('Run button enables after selecting a script', () => {
      unlock();
      fireEvent.change(screen.getByRole('combobox', { name: 'Script' }), {
        target: { value: 'Test Script' },
      });
      expect(screen.getByRole('button', { name: 'Run' })).not.toBeDisabled();
    });

    test('shows the script description after selecting a script', () => {
      unlock();
      fireEvent.change(screen.getByRole('combobox', { name: 'Script' }), {
        target: { value: 'Test Script' },
      });
      expect(screen.getByText('A test script description.')).toBeInTheDocument();
    });
  });
});
