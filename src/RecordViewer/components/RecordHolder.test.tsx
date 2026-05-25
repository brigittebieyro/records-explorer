import { render, screen } from '@testing-library/react';
import RecordHolder from './RecordHolder';
import { CombinedLiftData } from '../../Utils/types';

jest.mock('react-spinners', () => ({
  CircleLoader: () => <div data-testid="loading-spinner" />,
}));

const mockLifter: CombinedLiftData = {
  name: 'Jane Smith',
  total: 200,
  best_snatch: 90,
  'best_c&j': 110,
  lifter_age: '25',
  lift_date: '2023-05-15',
  club: 'Test Club',
  meet: 'State Championship 2023',
  action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/12345' }],
};

const renderHolder = (
  overrides: Partial<{
    lifterData: CombinedLiftData;
    index: number;
    individualLiftsData: CombinedLiftData[];
    sortType: 'total' | 'best_snatch' | 'best_c&j' | 'lift_date';
  }> = {}
) => {
  const props = {
    lifterData: mockLifter,
    index: 0,
    individualLiftsData: [] as CombinedLiftData[],
    sortType: 'total' as const,
    ...overrides,
  };
  return render(<RecordHolder {...props} />);
};

describe('RecordHolder', () => {
  describe('Basic Rendering', () => {
    test('renders lifter name', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('Jane Smith');
    });

    test('renders total value', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('200');
    });

    test('renders snatch value when available', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('90');
    });

    test('renders clean and jerk value when available', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('110');
    });

    test('renders lifter age', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('25');
    });

    test('renders lift date', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('2023-05-15');
    });

    test('renders club name', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('Test Club');
    });

    test('shows Unaffiliated when club is null', () => {
      const { container } = renderHolder({ lifterData: { ...mockLifter, club: null } });
      expect(container).toHaveTextContent('Unaffiliated');
    });

    test('shows Unaffiliated when club is a number', () => {
      const { container } = renderHolder({
        lifterData: { ...mockLifter, club: 42 as unknown as string },
      });
      expect(container).toHaveTextContent('Unaffiliated');
    });

    test('renders meet name when provided', () => {
      const { container } = renderHolder();
      expect(container).toHaveTextContent('State Championship 2023');
    });

    test('does not render meet name when absent', () => {
      const { container } = renderHolder({ lifterData: { ...mockLifter, meet: undefined } });
      expect(container).not.toHaveTextContent('State Championship 2023');
    });

    test('links to More Info at the lifter action URL', () => {
      renderHolder();
      const link = screen.getByText(/More Info/);
      expect(link).toHaveAttribute(
        'href',
        'https://usaweightlifting.sport80.com/public/rankings/member/12345'
      );
    });
  });

  describe('Styling', () => {
    test('applies record-current class to index 0', () => {
      const { container } = renderHolder({ index: 0 });
      expect(container.querySelector('.record-viewer-record-holder')).toHaveClass(
        'record-viewer-record-current'
      );
    });

    test('does not apply record-current class to non-zero index', () => {
      const { container } = renderHolder({ index: 1 });
      expect(container.querySelector('.record-viewer-record-holder')).not.toHaveClass(
        'record-viewer-record-current'
      );
    });
  });

  describe('Ranking Display', () => {
    test('shows ranking number for non-date sort types', () => {
      const { container } = renderHolder({ index: 2, sortType: 'total' });
      expect(container.querySelector('.record-viewer-ranking')).toBeInTheDocument();
      expect(container.querySelector('.record-viewer-ranking')).toHaveTextContent('3');
    });

    test('hides ranking number for date sort type', () => {
      const { container } = renderHolder({ index: 0, sortType: 'lift_date' });
      expect(container.querySelector('.record-viewer-ranking')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner when best_snatch is undefined and no match in individualLiftsData', () => {
      renderHolder({ lifterData: { ...mockLifter, best_snatch: undefined } });
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('does not show loading spinner when best_snatch is a positive value', () => {
      renderHolder();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    test('does not show loading spinner when best_snatch is 0', () => {
      renderHolder({ lifterData: { ...mockLifter, best_snatch: 0 } });
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Individual Lift Data Enrichment', () => {
    test('enriches lifter data from individualLiftsData when best_snatch is missing', () => {
      const liftData: CombinedLiftData = {
        name: 'Jane Smith',
        total: 200,
        date: '2023-05-15',
        best_snatch: 95,
        'best_c&j': 115,
        lift_date: '2023-05-15',
        lifter_age: '25',
        action: [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/12345' }],
      };
      const { container } = renderHolder({
        lifterData: { ...mockLifter, best_snatch: undefined },
        individualLiftsData: [liftData],
      });
      expect(container).toHaveTextContent('95');
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    test('does not enrich when no lifter in individualLiftsData matches', () => {
      const liftData: CombinedLiftData = {
        name: 'Different Lifter',
        total: 200,
        date: '2023-05-15',
        best_snatch: 99,
        lift_date: '2023-05-15',
        lifter_age: '25',
        action: [{ url: 'https://example.com' }],
      };
      renderHolder({
        lifterData: { ...mockLifter, best_snatch: undefined },
        individualLiftsData: [liftData],
      });
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Prior Group Display', () => {
    const lifterWithClassData: CombinedLiftData = {
      ...mockLifter,
      classData: {
        name: 'Historic Weight Class',
        start: '2015-01-01',
        end: '2020-12-31',
        sport80Id: 999,
        gender: 'female',
      },
    };

    test('shows prior group class name when classData is present', () => {
      const { container } = renderHolder({ lifterData: lifterWithClassData });
      expect(container).toHaveTextContent('Historic Weight Class');
    });

    test('shows class year range when classData is present', () => {
      const { container } = renderHolder({ lifterData: lifterWithClassData });
      expect(container).toHaveTextContent('2015');
      expect(container).toHaveTextContent('2020');
    });

    test('does not show prior group header when classData is absent', () => {
      const { container } = renderHolder();
      expect(container).not.toHaveTextContent('Historic Weight Class');
    });
  });
});
