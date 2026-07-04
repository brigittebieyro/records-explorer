import { render, screen, within } from '@testing-library/react';
import LocalMeetResultsByWeightClass from './LocalMeetResultsByWeightClass';
import { MeetResult } from '../Utils/types';

const makeResult = (overrides: object = {}): MeetResult =>
  ({
    age_category: "Open Women's 59kg",
    'best_c&j': 100,
    best_snatch: 80,
    'body_weight_(kg)': 58.4,
    'c&j_lift_1': 95,
    'c&j_lift_2': 100,
    'c&j_lift_3': -105,
    date: '2026-03-01',
    lifter: 'Jane Doe',
    meet: 'Sacramento Open',
    snatch_lift_1: 75,
    snatch_lift_2: 80,
    snatch_lift_3: -82,
    total: 180,
    ...overrides,
  }) as MeetResult;

describe('LocalMeetResultsByWeightClass (user-based)', () => {
  test('C-05: groups results into Women and Men columns by weight class', () => {
    const { container } = render(
      <LocalMeetResultsByWeightClass
        meetResults={[
          makeResult(),
          makeResult({ age_category: "Open Men's 73kg", lifter: 'John Doe', total: 250 }),
        ]}
      />
    );

    const columns = container.querySelectorAll('.all-records-column');
    expect(within(columns[0] as HTMLElement).getByText('Women')).toBeInTheDocument();
    expect(within(columns[0] as HTMLElement).getByText("Women's 59kg")).toBeInTheDocument();
    expect(within(columns[0] as HTMLElement).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(columns[1] as HTMLElement).getByText('Men')).toBeInTheDocument();
    expect(within(columns[1] as HTMLElement).getByText("Men's 73kg")).toBeInTheDocument();
    expect(within(columns[1] as HTMLElement).getByText('John Doe')).toBeInTheDocument();
  });

  test('C-05: keeps only the best total per lifter', () => {
    render(
      <LocalMeetResultsByWeightClass
        meetResults={[
          makeResult({ total: 150, best_snatch: 65, 'best_c&j': 85 }),
          makeResult({ total: 180 }),
        ]}
      />
    );

    expect(screen.getAllByText('Jane Doe')).toHaveLength(1);
    expect(screen.getByText(/180kg Total/)).toBeInTheDocument();
    expect(screen.queryByText(/150kg Total/)).toBeNull();
  });

  test('C-05: ranks lifters by total, descending', () => {
    const { container } = render(
      <LocalMeetResultsByWeightClass
        meetResults={[
          makeResult({ lifter: 'Lower Total', total: 150 }),
          makeResult({ lifter: 'Higher Total', total: 190 }),
        ]}
      />
    );

    const items = container.querySelectorAll('.local-meet-result-item');
    expect(items[0].textContent).toContain('1');
    expect(items[0].textContent).toContain('Higher Total');
    expect(items[1].textContent).toContain('2');
    expect(items[1].textContent).toContain('Lower Total');
  });

  test('C-05: each row shows the snatch, clean & jerk, and total', () => {
    render(<LocalMeetResultsByWeightClass meetResults={[makeResult()]} />);

    expect(screen.getByText(/80kg Snatch • 100kg Clean & Jerk • 180kg Total/)).toBeInTheDocument();
  });

  test('C-05: weight classes are ordered ascending within a column', () => {
    const { container } = render(
      <LocalMeetResultsByWeightClass
        meetResults={[
          makeResult({ age_category: "Open Women's 71kg", lifter: 'Heavier' }),
          makeResult({ age_category: "Open Women's 45kg", lifter: 'Lighter' }),
        ]}
      />
    );

    const headers = Array.from(container.querySelectorAll('.all-records-weight-class-header')).map(
      (node) => node.textContent
    );
    expect(headers).toEqual(["Women's 45kg", "Women's 71kg"]);
  });

  test('C-06: unclassifiable divisions land under And More instead of disappearing', () => {
    render(
      <LocalMeetResultsByWeightClass
        meetResults={[makeResult({ age_category: 'Mixed Session 1', lifter: 'Mystery Lifter' })]}
      />
    );

    expect(screen.getByText('And More')).toBeInTheDocument();
    expect(screen.getByText('Mystery Lifter')).toBeInTheDocument();
  });

  test('C-06: the And More section is hidden when every result is classified', () => {
    render(<LocalMeetResultsByWeightClass meetResults={[makeResult()]} />);
    expect(screen.queryByText('And More')).toBeNull();
  });

  test("C-05: female keywords win over the men's substring in women's divisions", () => {
    const { container } = render(
      <LocalMeetResultsByWeightClass
        meetResults={[makeResult({ age_category: 'Female 64kg', lifter: 'Jane Doe' })]}
      />
    );

    const columns = container.querySelectorAll('.all-records-column');
    expect(within(columns[0] as HTMLElement).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(columns[1] as HTMLElement).queryByText('Jane Doe')).toBeNull();
  });

  test('C-05: empty columns show their own empty messages', () => {
    render(
      <LocalMeetResultsByWeightClass
        meetResults={[makeResult({ age_category: "Open Men's 73kg", lifter: 'John Doe' })]}
      />
    );

    expect(screen.getByText("No women's results found.")).toBeInTheDocument();
    expect(screen.queryByText("No men's results found.")).toBeNull();
  });
});
