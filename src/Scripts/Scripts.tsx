import { useState } from 'react';
import { scripts } from '../Data/scripts';
import { scriptsPassword, wsoName } from '../Data/RoutesAndSettings';
import { hashPassword } from '../Utils/Utils';

function Scripts() {
  const [selectedName, setSelectedName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [error, setError] = useState<string | undefined>();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const selectedScript = scripts.find((s) => s.name === selectedName);

  const handlePasswordSubmit = async () => {
    const hashed = await hashPassword(passwordInput, wsoName);
    if (hashed === scriptsPassword) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleRun = async () => {
    if (!selectedScript) return;
    setIsRunning(true);
    setStatus('idle');
    setError(undefined);
    try {
      const csv = await selectedScript.source();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'record-breaking-analysis.csv';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="App">
      <div className="info-page-parent">
        <div className="record-viewer-options-bar">
          <span>Select a script: </span>
          <select
            aria-label="Script"
            className="header-button"
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            disabled={!isUnlocked || isRunning}
          >
            <option value="">Select a script</option>
            {isUnlocked &&
              scripts.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
          </select>
          <button
            className="header-button"
            onClick={handleRun}
            disabled={!isUnlocked || !selectedName || isRunning}
          >
            {isRunning ? 'Running…' : 'Run'}
          </button>
        </div>

        <h2>Scripts</h2>
        <div className="info-page-box">
          <p>
            This page is meant for WSO Committee members to perform batch operations, such as
            detecting all recordbreaking lifts at the most recent compeitition. These scripts make a
            LOT of requests to USAW's database at once so PLEASE BE CONSIDERATE and only ever run
            one at a time - avoid opening multiple tabs to multitask.
          </p>
        </div>

        {selectedScript && (
          <div className="info-page-box">
            <p>{selectedScript.description}</p>
          </div>
        )}

        {!isUnlocked && (
          <div className="info-page-box">
            <p>
              <span>Password: </span>
              <input
                type="password"
                className="header-button"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <button className="header-button" onClick={handlePasswordSubmit}>
                Go
              </button>
              {passwordError && <span> Incorrect password.</span>}
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="info-page-box">
            <p>Download complete.</p>
          </div>
        )}

        {error && (
          <div className="info-page-box">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scripts;
