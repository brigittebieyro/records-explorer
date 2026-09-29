import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipationLevelsForm from './ParticipationLevelsForm';
import { runParticipationLevels } from '../../RunnableScripts/participationLevels';
import { downloadCsv } from '../../Utils/Utils';

/** The sweep itself is covered in participationLevels.test.ts; here it only has to be called. */
jest.mock('../../RunnableScripts/participationLevels', () => ({
  ...jest.requireActual('../../RunnableScripts/participationLevels'),
  runParticipationLevels: jest.fn(),
}));

jest.mock('../../Utils/Utils', () => ({
  ...jest.requireActual('../../Utils/Utils'),
  downloadCsv: jest.fn(),
}));

const sweep = runParticipationLevels as jest.Mock;
const download = downloadCsv as jest.Mock;

/** The field carries no visible label; the operator reads its placeholder. */
const monthsInput = () => screen.getByPlaceholderText('Number of months');
const goButton = () => screen.getByRole('button', { name: 'Go' });

describe('ParticipationLevelsForm (user-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('F-12: the field starts empty and Go waits for a window', () => {
    render(<ParticipationLevelsForm />);

    // The placeholder names the field; it is not a value, so nothing is gathered until one is typed.
    expect(monthsInput()).toHaveValue('');
    expect(goButton()).toBeDisabled();
  });

  test('F-12: Go stays disabled for anything that is not a count of months', async () => {
    render(<ParticipationLevelsForm />);

    for (const value of ['0', '-1', '1.5', 'abc']) {
      await userEvent.clear(monthsInput());
      await userEvent.type(monthsInput(), value);
      expect(goButton()).toBeDisabled();
    }

    await userEvent.clear(monthsInput());
    await userEvent.type(monthsInput(), '12');
    expect(goButton()).toBeEnabled();

    // No ceiling: a wide window costs the same number of requests as a narrow one.
    await userEvent.clear(monthsInput());
    await userEvent.type(monthsInput(), '600');
    expect(goButton()).toBeEnabled();
  });

  test('F-11: Go gathers the window and downloads the counts', async () => {
    sweep.mockResolvedValue('Age Group ID,Weight Class ID,Gender,Total\nOPEN,W49,female,7\n');
    render(<ParticipationLevelsForm />);

    await userEvent.type(monthsInput(), '12');
    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(sweep).toHaveBeenCalledWith(12, expect.any(Function));
    expect(download).toHaveBeenCalledWith(
      'Age Group ID,Weight Class ID,Gender,Total\nOPEN,W49,female,7\n',
      'participation-levels-last-12-months.csv'
    );
  });

  test('F-11: the sweep reports how far along it is', async () => {
    let report: (completed: number, total: number) => void = () => {};
    sweep.mockImplementation(
      (_months: number, onProgress: (completed: number, total: number) => void) => {
        report = onProgress;
        return new Promise<string>(() => {});
      }
    );
    render(<ParticipationLevelsForm />);

    await userEvent.type(monthsInput(), '12');
    await userEvent.click(goButton());

    const working = await screen.findByRole('button', { name: 'Working…' });
    expect(working).toBeDisabled();
    expect(monthsInput()).toBeDisabled();

    // The sweep reports from outside React's event handling, so the update needs wrapping.
    act(() => report(5, 298));

    expect(screen.getByText('Checked 5 of 298 combinations…')).toBeInTheDocument();
  });

  test('F-13: a failing sweep shows the error and downloads nothing', async () => {
    sweep.mockRejectedValue(new Error('proxy down'));
    render(<ParticipationLevelsForm />);

    await userEvent.type(monthsInput(), '12');
    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });
    expect(screen.getByText(/proxy down/)).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
    expect(screen.queryByText('Download complete.')).toBeNull();
    expect(goButton()).toBeEnabled();
  });

  test('editing the window clears the last outcome', async () => {
    sweep.mockResolvedValue('Age Group ID,Weight Class ID,Gender,Total\n');
    render(<ParticipationLevelsForm />);

    await userEvent.type(monthsInput(), '12');
    await userEvent.click(goButton());
    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });

    await userEvent.type(monthsInput(), '4');

    // "Download complete." under a field reading 124 would claim a file that was never gathered.
    expect(screen.queryByText('Download complete.')).toBeNull();
  });
});
