import { render, screen } from '@testing-library/react';
import LocalMeetResultsByWeightClass from './LocalMeetResultsByWeightClass';
import { MeetResult } from '../Utils/types';

const makeResult = (overrides: Partial<MeetResult> = {}): MeetResult => ({
  age_category: "Women's 59kg",
  lifter: 'Jane Doe',
  best_snatch: 80,
  'best_c&j': 100,
  total: 180,
  'body_weight_(kg)': 58,
  'c&j_lift_1': 95,
  'c&j_lift_2': 100,
  'c&j_lift_3': 0,
  snatch_lift_1: 75,
  snatch_lift_2: 80,
  snatch_lift_3: 0,
  date: '2026-01-01',
  meet: 'Test Meet',
  ...overrides,
});

describe('LocalMeetResultsByWeightClass', () => {
  describe('Section headers', () => {
    test('renders Women and Men section headings', () => {
      render(<LocalMeetResultsByWeightClass meetResults={[]} />);
      expect(screen.getByText('Women')).toBeInTheDocument();
      expect(screen.getByText('Men')).toBeInTheDocument();
    });

    test("shows empty message when no women's results", () => {
      render(<LocalMeetResultsByWeightClass meetResults={[]} />);
      expect(screen.getByText("No women's results found.")).toBeInTheDocument();
    });

    test("shows empty message when no men's results", () => {
      render(<LocalMeetResultsByWeightClass meetResults={[]} />);
      expect(screen.getByText("No men's results found.")).toBeInTheDocument();
    });
  });

  describe('Weight class grouping', () => {
    test("renders a weight class header for a women's result", () => {
      const result = makeResult({ age_category: "Women's 59kg", lifter: 'Jane Doe', total: 180 });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.getByText("Women's 59kg")).toBeInTheDocument();
    });

    test("renders a weight class header for a men's result", () => {
      const result = makeResult({ age_category: "Men's 73kg", lifter: 'John Smith', total: 250 });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.getByText("Men's 73kg")).toBeInTheDocument();
    });

    test('renders a super-heavyweight (plus) weight class', () => {
      const result = makeResult({ age_category: "Women's 87+kg", lifter: 'Alice', total: 200 });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.getByText("Women's 87+kg")).toBeInTheDocument();
    });

    test('groups multiple lifters under the same weight class', () => {
      const results = [
        makeResult({ age_category: "Women's 59kg", lifter: 'Jane Doe', total: 180 }),
        makeResult({ age_category: "Women's 59kg", lifter: 'Alice Lee', total: 170 }),
      ];
      render(<LocalMeetResultsByWeightClass meetResults={results} />);
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Alice Lee')).toBeInTheDocument();
      // Only one weight class header should appear
      expect(screen.getAllByText("Women's 59kg")).toHaveLength(1);
    });
  });

  describe('Sorting', () => {
    test('displays results in descending total order', () => {
      const results = [
        makeResult({ age_category: "Men's 73kg", lifter: 'Low Total', total: 200 }),
        makeResult({ age_category: "Men's 73kg", lifter: 'High Total', total: 280 }),
      ];
      render(<LocalMeetResultsByWeightClass meetResults={results} />);
      const items = screen.getAllByRole('listitem');
      const texts = items.map((li) => li.textContent ?? '');
      expect(texts.findIndex((t) => t.includes('High Total'))).toBeLessThan(
        texts.findIndex((t) => t.includes('Low Total'))
      );
    });

    test('sorts weight classes by ascending numeric value', () => {
      const results = [
        makeResult({ age_category: "Women's 76kg", lifter: 'Heavier', total: 210 }),
        makeResult({ age_category: "Women's 49kg", lifter: 'Lighter', total: 160 }),
      ];
      render(<LocalMeetResultsByWeightClass meetResults={results} />);
      const headers = screen.getAllByText(/Women's \d+kg/);
      expect(headers[0].textContent).toBe("Women's 49kg");
      expect(headers[1].textContent).toBe("Women's 76kg");
    });
  });

  describe('Deduplication', () => {
    test('keeps only the best total per lifter within a weight class', () => {
      const results = [
        makeResult({ age_category: "Men's 89kg", lifter: 'Sam', total: 300 }),
        makeResult({ age_category: "Men's 89kg", lifter: 'Sam', total: 260 }),
      ];
      render(<LocalMeetResultsByWeightClass meetResults={results} />);
      expect(screen.getAllByText('Sam')).toHaveLength(1);
      expect(screen.getByText(/300kg Total/)).toBeInTheDocument();
    });
  });

  describe('Unclassified results', () => {
    test('shows "And More" section for results with no recognizable weight class', () => {
      const result = makeResult({ age_category: 'Open', lifter: 'Mystery Lifter', total: 200 });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.getByText('And More')).toBeInTheDocument();
      expect(screen.getByText('Mystery Lifter')).toBeInTheDocument();
    });

    test('does not show "And More" section when all results are classified', () => {
      const result = makeResult({ age_category: "Women's 59kg", lifter: 'Jane Doe', total: 180 });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.queryByText('And More')).not.toBeInTheDocument();
    });
  });

  describe('Lift details', () => {
    test('displays snatch, clean & jerk, and total for each result', () => {
      const result = makeResult({
        age_category: "Women's 59kg",
        lifter: 'Jane Doe',
        best_snatch: 82,
        'best_c&j': 104,
        total: 186,
      });
      render(<LocalMeetResultsByWeightClass meetResults={[result]} />);
      expect(screen.getByText(/82kg Snatch/)).toBeInTheDocument();
      expect(screen.getByText(/104kg Clean/)).toBeInTheDocument();
      expect(screen.getByText(/186kg Total/)).toBeInTheDocument();
    });
  });
});
