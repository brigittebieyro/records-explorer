import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptionsBar, { OptionsBarButton, OptionsBarSelect } from './OptionsBar';

const noop = () => {};

const weightClassOptions = [
  { value: 'W48', label: "Women's 48kg" },
  { value: 'W53', label: "Women's 53kg" },
];

const makeSelect = (overrides: object = {}): OptionsBarSelect => ({
  id: 'weight-class-select',
  name: 'Weight Class',
  value: '',
  onChange: noop,
  options: weightClassOptions,
  ...overrides,
});

const makeButton = (overrides: object = {}): OptionsBarButton => ({
  label: 'Go',
  onClick: noop,
  enablement: 'enabled',
  ...overrides,
});

const renderOptionsBar = (overrides: object = {}) => {
  const props = {
    label: 'Select a weight class: ',
    selects: [makeSelect()],
    buttons: [makeButton()],
    ...overrides,
  };
  return render(<OptionsBar {...props} />);
};

// A small stateful harness so a select's value actually updates in response to
// the user picking something, the way it does inside a real page.
function StatefulSingleSelectBar({
  onGoClick = noop,
  initialValue = '',
}: {
  onGoClick?: () => void;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <OptionsBar
      label="Select a weight class: "
      selects={[makeSelect({ value, onChange: setValue })]}
      buttons={[{ label: 'Go', onClick: onGoClick, enablement: 'onSelectionChange' }]}
    />
  );
}

function StatefulTwoSelectBar({ onGoClick = noop }: { onGoClick?: () => void }) {
  const [ageGroup, setAgeGroup] = useState('OPEN');
  const [weightClass, setWeightClass] = useState('');
  return (
    <OptionsBar
      label="Select a weight class & group: "
      selects={[
        {
          id: 'age-group-select',
          name: 'Age Group',
          value: ageGroup,
          onChange: setAgeGroup,
          options: [
            { value: 'OPEN', label: 'Open' },
            { value: 'U11', label: 'Under 11' },
          ],
        },
        makeSelect({ value: weightClass, onChange: setWeightClass }),
      ]}
      buttons={[{ label: 'Go', onClick: onGoClick, enablement: 'onSelectionChange' }]}
    />
  );
}

describe('OptionsBar (user-based)', () => {
  test('shows the toolbar label text', () => {
    renderOptionsBar({ label: 'Select a weight class & group: ' });
    expect(screen.getByText('Select a weight class & group:')).toBeInTheDocument();
  });

  test('a select lists all of its options, addressable by name', () => {
    renderOptionsBar();

    const select = screen.getByLabelText('Weight Class');
    expect(within(select).getByRole('option', { name: "Women's 48kg" })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: "Women's 53kg" })).toBeInTheDocument();
  });

  test('a placeholder is shown while nothing is selected', () => {
    renderOptionsBar({
      selects: [makeSelect({ value: '', placeholder: 'Select a Weight Class' })],
    });

    expect(screen.getByRole('option', { name: 'Select a Weight Class' })).toBeInTheDocument();
  });

  test('the placeholder disappears once a value is selected', () => {
    renderOptionsBar({
      selects: [makeSelect({ value: 'W48', placeholder: 'Select a Weight Class' })],
    });

    expect(screen.queryByRole('option', { name: 'Select a Weight Class' })).toBeNull();
  });

  test('no placeholder is rendered when one is not provided', () => {
    renderOptionsBar({ selects: [makeSelect({ value: '' })] });

    const select = screen.getByLabelText('Weight Class');
    expect(within(select).getAllByRole('option')).toHaveLength(2);
  });

  test('an option flagged disabled cannot be chosen, while its siblings can', () => {
    renderOptionsBar({
      selects: [
        makeSelect({
          options: [
            { value: 'W48', label: "Women's 48kg", disabled: true },
            { value: 'W53', label: "Women's 53kg" },
          ],
        }),
      ],
    });

    expect(screen.getByRole('option', { name: "Women's 48kg" })).toBeDisabled();
    expect(screen.getByRole('option', { name: "Women's 53kg" })).toBeEnabled();
  });

  test('a select flagged disabled cannot be interacted with at all', () => {
    renderOptionsBar({ selects: [makeSelect({ disabled: true })] });

    expect(screen.getByLabelText('Weight Class')).toBeDisabled();
  });

  test('choosing an option tells the caller which value was picked', async () => {
    const onChange = jest.fn();
    renderOptionsBar({ selects: [makeSelect({ onChange })] });

    await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W53');
    expect(onChange).toHaveBeenCalledWith('W53');
  });

  test('multiple selects each show up under their own name', () => {
    renderOptionsBar({
      selects: [
        makeSelect({
          id: 'age-group-select',
          name: 'Age Group',
          options: [{ value: 'OPEN', label: 'Open' }],
        }),
        makeSelect(),
      ],
    });

    expect(screen.getByLabelText('Age Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight Class')).toBeInTheDocument();
  });

  test('a button with enablement "disabled" cannot be clicked', () => {
    renderOptionsBar({ buttons: [makeButton({ label: 'Go', enablement: 'disabled' })] });
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  test('a button with enablement "enabled" fires its onClick when clicked', async () => {
    const onClick = jest.fn();
    renderOptionsBar({ buttons: [makeButton({ label: 'Run', onClick, enablement: 'enabled' })] });

    const button = screen.getByRole('button', { name: 'Run' });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('multiple buttons render in the order given, each independently clickable', async () => {
    const onGo = jest.fn();
    const onOther = jest.fn();
    renderOptionsBar({
      buttons: [
        makeButton({ label: 'Go', onClick: onGo, enablement: 'enabled' }),
        makeButton({ label: 'Other', onClick: onOther, enablement: 'enabled' }),
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await userEvent.click(screen.getByRole('button', { name: 'Other' }));
    expect(onGo).toHaveBeenCalledTimes(1);
    expect(onOther).toHaveBeenCalledTimes(1);
  });

  test('no Reset button appears when onReset is not provided', () => {
    renderOptionsBar();
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  test('a Reset button appears and fires onReset when provided', async () => {
    const onReset = jest.fn();
    renderOptionsBar({ onReset });

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    expect(resetButton).toBeInTheDocument();
    await userEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  describe('enablement: "onSelectionChange"', () => {
    test('starts disabled even before anything is chosen', () => {
      render(<StatefulSingleSelectBar />);
      expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    });

    test('starts disabled even when the select is pre-filled with a real value', () => {
      render(<StatefulSingleSelectBar initialValue="W48" />);
      expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    });

    test('becomes enabled once the placeholder is replaced with a real selection', async () => {
      render(<StatefulSingleSelectBar />);

      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W48');
      expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    });

    test('re-disables itself once clicked, and fires onClick', async () => {
      const onGoClick = jest.fn();
      render(<StatefulSingleSelectBar onGoClick={onGoClick} />);
      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W48');

      const goButton = screen.getByRole('button', { name: 'Go' });
      await userEvent.click(goButton);

      expect(onGoClick).toHaveBeenCalledTimes(1);
      expect(goButton).toBeDisabled();
    });

    test('can be run again once the value changes', async () => {
      render(<StatefulSingleSelectBar />);
      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W48');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));

      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W53');
      expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    });

    test('with two selects, both must have real values before it enables', async () => {
      render(<StatefulTwoSelectBar />);

      // Age Group already defaults to a real value ('OPEN'); Weight Class is still empty.
      expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();

      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W48');
      expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    });

    test('with two selects, changing just one of them is enough to allow a re-run', async () => {
      const onGoClick = jest.fn();
      render(<StatefulTwoSelectBar onGoClick={onGoClick} />);
      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W48');
      await userEvent.click(screen.getByRole('button', { name: 'Go' }));
      expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();

      // Only the Weight Class select changes; Age Group is untouched.
      await userEvent.selectOptions(screen.getByLabelText('Weight Class'), 'W53');
      expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
    });
  });
});
