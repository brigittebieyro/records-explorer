import reportWebVitals from './reportWebVitals';

describe('reportWebVitals', () => {
  test('does nothing when called without a callback', () => {
    expect(() => reportWebVitals()).not.toThrow();
  });

  test('does nothing when called with undefined', () => {
    expect(() => reportWebVitals(undefined)).not.toThrow();
  });
});
