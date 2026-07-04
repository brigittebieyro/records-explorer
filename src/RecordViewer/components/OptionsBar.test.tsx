import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptionsBar from './OptionsBar';
import { ageGroups } from '../../Data/ageGroups';
import { defaultWeightClasses } from '../../Data/defaultWeightClasses';
import { u11WeightClasses } from '../../Data/youthWeightClasses';

const noop = () => {};

const renderOptionsBar = (overrides: object = {}) => {
  const props = {
    selectedAgeGroup: 'OPEN',
    selectedWeightClass: '',
    onAgeGroupChange: noop,
    onWeightClassChange: noop,
    onGo: noop,
    onReset: noop,
    showReset: false,
    ...overrides,
  };
  return render(<OptionsBar {...props} />);
};

// A small stateful harness so selections behave like they do inside RecordViewer.
function StatefulOptionsBar() {
  const [ageGroup, setAgeGroup] = useState('OPEN');
  const [weightClass, setWeightClass] = useState('');
  return (
    <OptionsBar
      selectedAgeGroup={ageGroup}
      selectedWeightClass={weightClass}
      onAgeGroupChange={setAgeGroup}
      onWeightClassChange={setWeightClass}
      onGo={noop}
      onReset={noop}
      showReset={false}
    />
  );
}

describe('OptionsBar (user-based)', () => {
  test('B-04: Go stays disabled until both age group and weight class are selected', () => {
    renderOptionsBar({ selectedAgeGroup: 'OPEN', selectedWeightClass: '' });
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  test('B-04: Go is enabled once both selections are made', () => {
    renderOptionsBar({
      selectedAgeGroup: 'OPEN',
      selectedWeightClass: defaultWeightClasses[0].id,
    });
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
  });

  test('B-04: clicking Go fires the onGo callback', async () => {
    const onGo = jest.fn();
    renderOptionsBar({
      selectedAgeGroup: 'OPEN',
      selectedWeightClass: defaultWeightClasses[0].id,
      onGo,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onGo).toHaveBeenCalledTimes(1);
  });

  test('B-05: the Age Group dropdown lists every age group', () => {
    renderOptionsBar();

    const select = screen.getByLabelText('Age Group');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(ageGroups.length);
    for (const group of ageGroups) {
      expect(within(select).getByRole('option', { name: group.name })).toBeInTheDocument();
    }
  });

  test('B-05: youth, Junior, and Masters age groups are all present', () => {
    renderOptionsBar();

    const select = screen.getByLabelText('Age Group');
    expect(within(select).getByRole('option', { name: 'Open' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Under 11' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Under 13' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /Junior/ })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: '35 - 39 years old' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: '90 years old and up' })).toBeInTheDocument();
  });

  test('B-06: Open shows the default (senior) weight classes', () => {
    renderOptionsBar({ selectedAgeGroup: 'OPEN' });

    const select = screen.getByLabelText('Weight Class');
    for (const wtClass of defaultWeightClasses) {
      expect(within(select).getByRole('option', { name: wtClass.name })).toBeInTheDocument();
    }
    expect(within(select).getByRole('option', { name: "Women's 48kg" })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: "Men's 110+kg" })).toBeInTheDocument();
  });

  test('B-06: switching to Under 11 shows the youth weight classes', async () => {
    render(<StatefulOptionsBar />);

    await userEvent.selectOptions(screen.getByLabelText('Age Group'), 'U11');

    const select = screen.getByLabelText('Weight Class');
    for (const wtClass of u11WeightClasses) {
      expect(within(select).getByRole('option', { name: wtClass.name })).toBeInTheDocument();
    }
    expect(within(select).queryByRole('option', { name: "Women's 48kg" })).toBeNull();
  });

  test('the Weight Class dropdown shows a placeholder until a class is chosen', () => {
    renderOptionsBar({ selectedWeightClass: '' });
    expect(screen.getByRole('option', { name: 'Select a Weight Class' })).toBeInTheDocument();
  });

  test('B-09: the Reset button only renders when showReset is set', async () => {
    const onReset = jest.fn();
    const { rerender } = render(
      <OptionsBar
        selectedAgeGroup="OPEN"
        selectedWeightClass=""
        onAgeGroupChange={noop}
        onWeightClassChange={noop}
        onGo={noop}
        onReset={onReset}
        showReset={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();

    rerender(
      <OptionsBar
        selectedAgeGroup="OPEN"
        selectedWeightClass=""
        onAgeGroupChange={noop}
        onWeightClassChange={noop}
        onGo={noop}
        onReset={onReset}
        showReset={true}
      />
    );
    const resetButton = screen.getByRole('button', { name: 'Reset' });
    await userEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
