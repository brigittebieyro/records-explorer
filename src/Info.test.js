import { render, screen } from '@testing-library/react';
import Info from './Info';

describe('Info', () => {
  test('renders the About Records heading', () => {
    render(<Info />);
    expect(screen.getByRole('heading', { level: 2, name: 'About Records' })).toBeInTheDocument();
  });

  test('mentions the WSO committee', () => {
    const { container } = render(<Info />);
    expect(container).toHaveTextContent('WSO committee');
  });

  test('includes content about local records', () => {
    const { container } = render(<Info />);
    expect(container).toHaveTextContent('Local Records');
  });
});
