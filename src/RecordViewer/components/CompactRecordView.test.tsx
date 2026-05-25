import { render, screen } from '@testing-library/react';
import CompactRecordView from './CompactRecordView';
import { StandardRecord } from '../../Utils/types';

describe('CompactRecordView', () => {
  test('renders nothing when record is undefined', () => {
    const { container } = render(<CompactRecordView />);
    expect(container.firstChild).toBeNull();
  });

  test('renders weight, lifter, event, and date', () => {
    const record: StandardRecord = {
      weight: '73',
      lifter: 'John Doe',
      event: 'Snatch',
      date: '2024-03-15',
    };
    const { container } = render(<CompactRecordView record={record} />);
    expect(screen.getByText('73kg')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(container.firstChild).toHaveTextContent('Snatch');
    expect(container.firstChild).toHaveTextContent('2024-03-15');
  });

  test('renders with null event and date', () => {
    const record: StandardRecord = {
      weight: '55',
      lifter: 'Jane Smith',
      event: null,
      date: null,
    };
    const { container } = render(<CompactRecordView record={record} />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('55kg')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});
