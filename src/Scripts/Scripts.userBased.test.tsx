import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Scripts from './Scripts';
import { scriptsPassword } from '../Data/RoutesAndSettings';
import { hashPassword } from '../Utils/Utils';
import { scripts } from '../Data/scripts';

jest.mock('../Utils/Utils', () => ({
  hashPassword: jest.fn(),
}));

jest.mock('../Data/scripts', () => ({
  scripts: [
    {
      name: 'Fetch Record Updates',
      description: 'Test script description.',
      source: jest.fn(),
    },
  ],
}));

const scriptSource = scripts[0].source as jest.Mock;

const getPasswordInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector('input[type="password"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
};

const unlock = async (container: HTMLElement) => {
  (hashPassword as jest.Mock).mockResolvedValue(scriptsPassword);
  await userEvent.type(getPasswordInput(container), 'the-right-password');
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
  await waitFor(() => {
    expect(screen.getByLabelText('Script')).toBeEnabled();
  });
};

describe('Scripts (user-based)', () => {
  let createObjectURL: jest.Mock;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    createObjectURL = jest.fn(() => 'blob:fake-url');
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: jest.fn(),
      configurable: true,
    });
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  test('F-01: the tools are locked behind the password gate', () => {
    const { container } = render(<Scripts />);

    expect(getPasswordInput(container)).toBeInTheDocument();
    expect(screen.getByLabelText('Script')).toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Fetch Record Updates' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  test('F-01: a wrong password submitted with Enter shows the error and stays locked', async () => {
    (hashPassword as jest.Mock).mockResolvedValue('not-the-right-hash');
    const { container } = render(<Scripts />);

    const input = getPasswordInput(container);
    await userEvent.type(input, 'wrong-password');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Script')).toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Fetch Record Updates' })).toBeNull();
  });

  test('F-01: typing again clears the password error', async () => {
    (hashPassword as jest.Mock).mockResolvedValue('not-the-right-hash');
    const { container } = render(<Scripts />);

    const input = getPasswordInput(container);
    await userEvent.type(input, 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => {
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
    });

    await userEvent.type(input, 'x');
    expect(screen.queryByText('Incorrect password.')).toBeNull();
  });

  test('F-02: the correct password unlocks the script dropdown and Run button', async () => {
    const { container } = render(<Scripts />);

    await unlock(container);

    expect(screen.getByRole('option', { name: 'Fetch Record Updates' })).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeNull();
    // Run stays disabled until a script is chosen.
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Record Updates');
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.getByText('Test script description.')).toBeInTheDocument();
  });

  test('F-03: Run shows Running…, downloads the CSV, and reports completion', async () => {
    let resolveCsv: (csv: string) => void = () => {};
    scriptSource.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCsv = resolve;
      })
    );
    const { container } = render(<Scripts />);
    await unlock(container);
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Record Updates');

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    const runningButton = await screen.findByRole('button', { name: 'Running…' });
    expect(runningButton).toBeDisabled();
    expect(screen.getByLabelText('Script')).toBeDisabled();

    resolveCsv('lifter,total\nJane Doe,180');

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const downloadLink = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(downloadLink.download).toBe('record-breaking-analysis.csv');
    expect(downloadLink.href).toContain('blob:fake-url');
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
  });

  test('F-04: a failing script shows the error box instead of failing silently', async () => {
    scriptSource.mockRejectedValue(new Error('proxy down'));
    const { container } = render(<Scripts />);
    await unlock(container);
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Record Updates');

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });
    expect(screen.getByText(/proxy down/)).toBeInTheDocument();
    expect(screen.queryByText('Download complete.')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
  });
});
