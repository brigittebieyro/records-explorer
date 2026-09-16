import { useState } from 'react';
import OptionsBar from '../Common/OptionsBar';
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

  const selectedScript = scripts.find((scriptObj) => scriptObj.name === selectedName);

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
    // A form-driven script has neither, and never reaches here -- its own controls replace the
    // Run button below. Destructured so both stay narrowed across the await.
    const { source, fileName } = selectedScript ?? {};
    if (!source || !fileName) return;
    setIsRunning(true);
    setStatus('idle');
    setError(undefined);
    try {
      const csv = await source();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
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
        <OptionsBar
          label="Select a script: "
          selects={[
            {
              id: 'script-select',
              name: 'Script',
              value: selectedName,
              onChange: setSelectedName,
              disabled: !isUnlocked || isRunning,
              placeholder: 'Select a script',
              options: isUnlocked
                ? scripts.map((scriptObj) => ({ value: scriptObj.name, label: scriptObj.name }))
                : [],
            },
          ]}
          buttons={
            // A form-driven script supplies its own submit control, so Run would be a second,
            // meaningless button. With nothing selected yet, Run still shows disabled.
            selectedScript?.Form
              ? []
              : [
                  {
                    label: isRunning ? 'Running…' : 'Run',
                    onClick: handleRun,
                    enablement: isUnlocked && !!selectedName && !isRunning ? 'enabled' : 'disabled',
                  },
                ]
          }
        />

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

        {selectedScript?.Form && (
          <div className="info-page-box">
            <selectedScript.Form />
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
                onChange={(eventObj) => {
                  setPasswordInput(eventObj.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(eventObj) => eventObj.key === 'Enter' && handlePasswordSubmit()}
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
