import { render, screen } from '@testing-library/react';
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

describe('Goals (user-based)', () => {
  test('D-01: renders the title and intro text', () => {
    render(<Goals />);

    expect(screen.getByText('Senior Nationals Qualification Rankings')).toBeInTheDocument();
    expect(screen.getByText(/2027 change in format for Senior Nationals/)).toBeInTheDocument();
  });

  test('D-01: links to the USAW public rankings site in a new tab', () => {
    render(<Goals />);

    const link = screen.getByRole('link', { name: "USAW's public rankings site" });
    expect(link).toHaveAttribute(
      'href',
      'https://usaweightlifting.sport80.com/public/rankings/all'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('D-02: renders Women and Men columns with one section per weight class', () => {
    render(<Goals />);

    expect(screen.getByRole('heading', { name: 'Women' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Men' })).toBeInTheDocument();
    expect(screen.getAllByTestId('goals-weight-class')).toHaveLength(defaultWeightClasses.length);
    for (const wtClass of defaultWeightClasses) {
      expect(screen.getByRole('heading', { name: wtClass.name })).toBeInTheDocument();
    }
  });

  test('D-03: the two lightest classes per gender get a qualifying count of 6, the rest 12', () => {
    render(<Goals />);

    const stubs = screen.getAllByTestId('goals-weight-class');
    const countsByClassId = new Map(
      stubs.map((stub) => [stub.getAttribute('data-class-id'), stub.getAttribute('data-safecount')])
    );

    for (const [index, wtClass] of femaleClasses.entries()) {
      expect(countsByClassId.get(wtClass.id)).toBe(index < 2 ? '6' : '12');
    }
    for (const [index, wtClass] of maleClasses.entries()) {
      expect(countsByClassId.get(wtClass.id)).toBe(index < 2 ? '6' : '12');
    }
  });
});
