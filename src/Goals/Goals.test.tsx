import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Goals from './Goals';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { WeightClass } from '../Utils/types';

jest.mock(
  './components/GoalsWeightClass',
  () => (props: { weightClass: WeightClass; safeCount: number }) => (
    <div
      data-testid="goals-weight-class"
      data-safecount={props.safeCount}
      data-class-id={props.weightClass.id}
    />
  )
);

const femaleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'female');
const maleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'male');

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const renderGoals = (initialEntry = '/goals') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Goals />
      <LocationProbe />
    </MemoryRouter>
  );

const runSearch = async (weightClassId: string) => {
  await userEvent.selectOptions(screen.getByLabelText('Weight Class'), weightClassId);
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
};

describe('Goals (user-based)', () => {
  test('D-01: renders the title and intro text', () => {
    renderGoals();

    expect(screen.getByText('Senior Nationals Qualification Rankings')).toBeInTheDocument();
    expect(screen.getByText(/2027 change in format for Senior Nationals/)).toBeInTheDocument();
  });

  test('D-01: links to the USAW public rankings site in a new tab', () => {
    renderGoals();

    const link = screen.getByRole('link', { name: "USAW's public rankings site" });
    expect(link).toHaveAttribute(
      'href',
      'https://usaweightlifting.sport80.com/public/rankings/all'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('nothing is fetched until a weight class is chosen and Go is clicked', () => {
    renderGoals();

    expect(screen.queryByTestId('goals-weight-class')).toBeNull();
    expect(
      screen.getByText('Select a weight class above and hit Go to see its qualification rankings.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  test('Go fetches only the selected weight class', async () => {
    renderGoals();

    await runSearch(femaleClasses[2].id);

    const stubs = screen.getAllByTestId('goals-weight-class');
    expect(stubs).toHaveLength(1);
    expect(stubs[0]).toHaveAttribute('data-class-id', femaleClasses[2].id);
    expect(screen.getByRole('heading', { name: femaleClasses[2].name })).toBeInTheDocument();

    const search = screen.getByTestId('location-search').textContent;
    expect(search).toContain(`weightClass=${femaleClasses[2].id}`);
  });

  test('the two lightest classes per gender get a qualifying count of 6, the rest 12', async () => {
    for (const [index, wtClass] of [...femaleClasses.entries(), ...maleClasses.entries()]) {
      const { unmount } = renderGoals();
      await runSearch(wtClass.id);

      const stub = screen.getByTestId('goals-weight-class');
      expect(stub).toHaveAttribute('data-safecount', index < 2 ? '6' : '12');
      unmount();
    }
  });

  test('Reset clears the results and the URL params', async () => {
    renderGoals();
    await runSearch(femaleClasses[0].id);

    await waitFor(() => {
      expect(screen.getByTestId('goals-weight-class')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.queryByTestId('goals-weight-class')).toBeNull();
    expect(screen.getByTestId('location-search').textContent).toBe('');
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
    expect(screen.getByLabelText('Weight Class')).toHaveValue('');
  });

  test('URL params auto-run the selection on load with the dropdown pre-selected', async () => {
    renderGoals(`/goals?weightClass=${maleClasses[0].id}`);

    await waitFor(() => {
      expect(screen.getByTestId('goals-weight-class')).toBeInTheDocument();
    });
    expect(screen.getByTestId('goals-weight-class')).toHaveAttribute(
      'data-class-id',
      maleClasses[0].id
    );
    expect(screen.getByLabelText('Weight Class')).toHaveValue(maleClasses[0].id);
  });

  test('bogus URL params are ignored without crashing', () => {
    renderGoals('/goals?weightClass=BOGUS');

    expect(screen.queryByTestId('goals-weight-class')).toBeNull();
  });
});
