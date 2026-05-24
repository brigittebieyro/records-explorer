jest.mock('./App', () => () => null);
jest.mock('./reportWebVitals', () => jest.fn());
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({ render: jest.fn() })),
}));

describe('index', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('renders App into #root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('./index');
    const { createRoot } = jest.requireMock('react-dom/client') as {
      createRoot: jest.Mock;
    };
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    const rootInstance = createRoot.mock.results[0].value as { render: jest.Mock };
    expect(rootInstance.render).toHaveBeenCalled();
  });
});
