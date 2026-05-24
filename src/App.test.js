import { render, screen } from '@testing-library/react';
import App from './App';

test.skip('renders learn react link', () => {
  // Does not do this anymore.  TODO: replace test.
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
