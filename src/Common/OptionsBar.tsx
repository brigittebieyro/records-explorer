import { useState } from 'react';

export interface OptionsBarSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface OptionsBarSelect {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  options: OptionsBarSelectOption[];
}

export type OptionsBarButtonEnablementStatus = 'disabled' | 'enabled' | 'onSelectionChange';

export interface OptionsBarButton {
  label: string;
  onClick: () => void;
  enablement: OptionsBarButtonEnablementStatus;
}

export interface OptionsBarProps {
  label: string;
  selects: OptionsBarSelect[];
  buttons: OptionsBarButton[];
  onReset?: () => void;
}

function OptionsBar({ label, selects, buttons, onReset }: OptionsBarProps) {
  // Tracks whether a select has changed since the last "onSelectionChange" button was run.
  // Starts false so those buttons always begin disabled, even if selects already hold values
  // (e.g. deep-linked from a URL) - they only arm once the user actually changes a selection.
  const [dirtySinceRun, setDirtySinceRun] = useState(false);
  const allSelectsHaveValues = selects.every((select) => !!select.value);
  const selectionChangeEnabled = dirtySinceRun && allSelectsHaveValues;

  return (
    <div className="record-viewer-options-bar">
      <span>{label}</span>

      {selects.map((select) => (
        <select
          key={select.id}
          aria-label={select.name}
          className="header-button"
          id={select.id}
          name={select.name}
          value={select.value}
          disabled={select.disabled}
          onChange={(eventObj) => {
            select.onChange(eventObj.target.value);
            setDirtySinceRun(true);
          }}
        >
          {select.placeholder && !select.value && <option value="">{select.placeholder}</option>}
          {select.options.map((option) => (
            <option
              key={`${select.id}-${option.value}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      ))}

      {buttons.map((button) => {
        const isEnabled =
          button.enablement === 'onSelectionChange'
            ? selectionChangeEnabled
            : button.enablement === 'enabled';
        return (
          <button
            key={button.label}
            className="header-button"
            onClick={() => {
              button.onClick();
              if (button.enablement === 'onSelectionChange') {
                setDirtySinceRun(false);
              }
            }}
            disabled={!isEnabled}
          >
            {button.label}
          </button>
        );
      })}

      {onReset && (
        <button className="header-button reset-button" onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  );
}

export default OptionsBar;
