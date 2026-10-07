import { render, screen } from '@testing-library/react';
import CompactRecordView from './CompactRecordView';

describe('CompactRecordView (user-based)', () => {
  test('B-02: renders the weight, lifter, event, and date', () => {
    const { container } = render(
      <CompactRecordView
        record={{
          weight: '80',
          lifter: 'Jane Smith',
          event: 'Sacramento Open',
          date: '2026-01-15',
        }}
      />
    );

    expect(screen.getByText('80kg')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(container.textContent).toBe('80kg — Jane Smith, 2026-01-15, Sacramento Open');
  });

  test('renders nothing when no record is provided', () => {
    const { container } = render(<CompactRecordView />);
    expect(container.firstChild).toBeNull();
  });
});
