/** Loads the scripts list with adaptiveRecordsScriptAvailable set to `available`. */
const loadScripts = (available: boolean): typeof import('./scripts') => {
  let loaded: typeof import('./scripts') | undefined;
  jest.isolateModules(() => {
    jest.doMock('./RoutesAndSettings', () => ({
      ...jest.requireActual('./RoutesAndSettings'),
      adaptiveRecordsScriptAvailable: available,
    }));
    loaded = require('./scripts');
  });
  jest.dontMock('./RoutesAndSettings');
  if (!loaded) throw new Error('scripts did not load');
  return loaded;
};

describe('scripts', () => {
  test('lists the adaptive records script when it is available', () => {
    const names = loadScripts(true).scripts.map((script) => script.name);
    expect(names).toContain('Fetch Adaptive Record Updates');
  });

  test('leaves the adaptive records script out when it is not available', () => {
    const names = loadScripts(false).scripts.map((script) => script.name);
    expect(names).not.toContain('Fetch Adaptive Record Updates');
    expect(names).toContain('Fetch Record Updates');
  });
});
