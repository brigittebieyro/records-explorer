import { render, screen } from '@testing-library/react';
import Standards from './Standards';
import { AgeGroupRecordSet } from './types';

const mockRecords: AgeGroupRecordSet = {
  ageGroup: 'OPEN',
  weightClass: '48',
  records: {
    Total: { weight: '200', lifter: 'Jane Smith', event: 'State Championship', date: '2023-05-15' },
    Snatch: { weight: '90', lifter: 'STANDARD', event: null, date: null },
    'Clean & Jerk': {
      weight: '110',
      lifter: 'Bob Jones',
      event: 'Regional Meet',
      date: '2022-11-01',
    },
  },
};

describe('Standards', () => {
  describe('Title and Fine Print', () => {
    test('renders title with weight class and age group names', () => {
      render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(screen.getByText(/Officially Recognized Records.*48kg.*Open/)).toBeInTheDocument();
    });

    test('renders fine print about contacting the WSO committee', () => {
      render(<Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={null} />);
      expect(screen.getByText(/WSO committee/)).toBeInTheDocument();
    });
  });

  describe('When relevantRecords is null', () => {
    test('does not render the standards section', () => {
      render(<Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={null} />);
      expect(screen.queryByRole('heading', { name: 'Total' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Snatch' })).not.toBeInTheDocument();
    });
  });

  describe('When relevantRecords is provided', () => {
    test('renders Total, Snatch, and Clean & Jerk headings', () => {
      render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(screen.getByRole('heading', { name: 'Total' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Snatch' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Clean & Jerk' })).toBeInTheDocument();
    });

    test('displays weight for each standard', () => {
      render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(screen.getByText('200kg')).toBeInTheDocument();
      expect(screen.getByText('90kg')).toBeInTheDocument();
      expect(screen.getByText('110kg')).toBeInTheDocument();
    });

    test('displays lifter name for each standard', () => {
      render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('STANDARD')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    test('shows event and date for non-STANDARD records', () => {
      render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(screen.getByText('State Championship')).toBeInTheDocument();
      expect(screen.getByText('2023-05-15')).toBeInTheDocument();
      expect(screen.getByText('Regional Meet')).toBeInTheDocument();
      expect(screen.getByText('2022-11-01')).toBeInTheDocument();
    });

    test('does not render event or date for STANDARD lifter', () => {
      const { container } = render(
        <Standards weightClassName="48kg" ageGroupName="Open" relevantRecords={mockRecords} />
      );
      expect(container).not.toHaveTextContent('null');
    });
  });
});
