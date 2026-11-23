import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Scripts from './Scripts';
import { scriptsPassword } from '../Data/RoutesAndSettings';
import { hashPassword } from '../Utils/Utils';
import { scripts } from '../Data/scripts';
import { ScriptOutput } from '../Utils/types';

// Only the password check is stubbed. The rest of the module stays real so that the download this
// page performs is the shipped one -- the assertions below are about its Blob and anchor.
jest.mock('../Utils/Utils', () => ({
  ...jest.requireActual('../Utils/Utils'),
  hashPassword: jest.fn(),
}));

jest.mock('../Data/scripts', () => ({
  scripts: [
    {
      name: 'Fetch Record Updates',
      description: 'Test script description.',
      fileName: 'record-breaking-analysis.csv',
      summaryFileName: 'record-summary.rtf',
      source: jest.fn(),
    },
    {
      name: 'Fetch Adaptive Record Updates',
      description: 'Test adaptive script description.',
      fileName: 'adaptive-record-breaking-analysis.csv',
      summaryFileName: 'adaptive-record-summary.rtf',
      source: jest.fn(),
    },
    {
      // A script that needs details from the operator: no source, no fileName, its own controls.
      name: 'Past Recordholder Certificate',
      description: 'Test certificate script description.',
      Form: () => <p>Stand-in for the certificate form</p>,
    },
    {
      name: 'Gather Participation Levels',
      description: 'Test participation script description.',
      Form: () => <p>Stand-in for the participation form</p>,
    },
  ],
}));

const scriptSource = scripts[0].source as jest.Mock;
const adaptiveScriptSource = scripts[1].source as jest.Mock;

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

  test('F-03: Run shows Running…, downloads the CSV and summary, and reports completion', async () => {
    let resolveOutput: (output: ScriptOutput) => void = () => {};
    scriptSource.mockReturnValue(
      new Promise<ScriptOutput>((resolve) => {
        resolveOutput = resolve;
      })
    );
    const { container } = render(<Scripts />);
    await unlock(container);
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Record Updates');

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    const runningButton = await screen.findByRole('button', { name: 'Running…' });
    expect(runningButton).toBeDisabled();
    expect(screen.getByLabelText('Script')).toBeDisabled();

    resolveOutput({ csv: 'lifter,total\nJane Smith,180', summary: '{\\rtf1 summary}' });

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const [csvBlob, summaryBlob] = createObjectURL.mock.calls.map((call) => call[0] as Blob);
    expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
    expect(summaryBlob.type).toBe('application/rtf');
    expect(clickSpy).toHaveBeenCalledTimes(2);
    const [csvLink, summaryLink] = clickSpy.mock.instances as unknown as HTMLAnchorElement[];
    expect(csvLink.download).toBe('record-breaking-analysis.csv');
    expect(csvLink.href).toContain('blob:fake-url');
    expect(summaryLink.download).toBe('record-summary.rtf');
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
  });

  test('F-05: each script downloads under its own filename', async () => {
    adaptiveScriptSource.mockResolvedValue({
      csv: 'category,lift\nAdaptive_All,Snatch',
      summary: '{\\rtf1 summary}',
    });
    const { container } = render(<Scripts />);
    await unlock(container);
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Adaptive Record Updates');

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(scriptSource).not.toHaveBeenCalled();
    const [csvLink, summaryLink] = clickSpy.mock.instances as unknown as HTMLAnchorElement[];
    expect(csvLink.download).toBe('adaptive-record-breaking-analysis.csv');
    expect(summaryLink.download).toBe('adaptive-record-summary.rtf');
  });

  test('F-06: a script that needs details shows its form in place of Run', async () => {
    const { container } = render(<Scripts />);
    await unlock(container);

    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Past Recordholder Certificate');

    expect(screen.getByText('Stand-in for the certificate form')).toBeInTheDocument();
    expect(screen.getByText('Test certificate script description.')).toBeInTheDocument();
    // Run would be a second, meaningless button next to the form's own.
    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
  });

  test('F-11: the participation script also replaces Run with its own form', async () => {
    const { container } = render(<Scripts />);
    await unlock(container);

    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Gather Participation Levels');

    expect(screen.getByText('Stand-in for the participation form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
  });

  test('F-06: switching back to a CSV script restores Run and drops the form', async () => {
    const { container } = render(<Scripts />);
    await unlock(container);
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Past Recordholder Certificate');

    await userEvent.selectOptions(screen.getByLabelText('Script'), 'Fetch Record Updates');

    expect(screen.queryByText('Stand-in for the certificate form')).toBeNull();
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
