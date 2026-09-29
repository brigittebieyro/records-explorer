import { useState } from 'react';
import {
  parseMonthCount,
  participationFileName,
  runParticipationLevels,
} from '../../RunnableScripts/participationLevels';
import { downloadCsv } from '../../Utils/Utils';

interface ParticipationLevelsInput {
  months: string;
}

const emptyForm: ParticipationLevelsInput = { months: '' };

function ParticipationLevelsForm() {
  const [form, setForm] = useState<ParticipationLevelsInput>(emptyForm);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<{ completed: number; total: number } | undefined>();

  const update = <Field extends keyof ParticipationLevelsInput>(
    field: Field,
    value: ParticipationLevelsInput[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Any edit invalidates the previous run -- leaving "Download complete." or a finished count up
    // while the field says something else reads as if the new window were the one gathered.
    setStatus('idle');
    setError(undefined);
    setProgress(undefined);
  };

  const monthCount = parseMonthCount(form.months);

  const handleGather = async () => {
    if (isWorking || monthCount === undefined) return;
    setIsWorking(true);
    setStatus('idle');
    setError(undefined);
    setProgress({ completed: 0, total: 0 });
    try {
      const csv = await runParticipationLevels(monthCount, (completed, total) =>
        setProgress({ completed, total })
      );
      downloadCsv(csv, participationFileName(monthCount));
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="script-form">
      <div className="script-form-item">
        <input
          id="participation-months"
          type="text"
          className="header-button"
          placeholder="Number of months"
          value={form.months}
          disabled={isWorking}
          onChange={(eventObj) => update('months', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <button
          className="header-button"
          onClick={handleGather}
          disabled={isWorking || monthCount === undefined}
        >
          {isWorking ? 'Working…' : 'Go'}
        </button>
      </div>

      {/* Held back until the first combination returns, so there is no flash of "0 of 0" -- the
          button's "Working…" covers that moment. */}
      {isWorking && progress && progress.total > 0 && (
        <p>
          Checked {progress.completed} of {progress.total} combinations…
        </p>
      )}

      {status === 'done' && <p>Download complete.</p>}

      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}
    </div>
  );
}

export default ParticipationLevelsForm;
