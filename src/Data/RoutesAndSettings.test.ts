import {
  americanRecordsUrl,
  certificateTitle,
  configSchema,
  currentRecordsSheetId,
  // endDate, -- for a future test
  getIndividualMeetResultsRoute,
  getLifterDataRoute,
  getLifterId,
  getLocalMeetByNameRoute,
  getMeetsRoute,
  getNationalsDateRange,
  getRankingsRoute,
  getRecentMonthsDateRange,
  getSheetRoute,
  githubUrl,
  localHomeUrl,
  localMeetStartDate,
  localScheduleUrl,
  maintainerEmail,
  maxCleanAndJerk,
  maxSnatch,
  maxTotal,
  nationalsQualifyingEndDate,
  nationalsQualifyingStartDate,
  priorRecordsSheetNames,
  publicSpreadsheetLink,
  toRecordDate,
  usawRankingsPublicSiteLink,
  wsoBoundary,
  wsoRegions,
  wsoStateNames,
  wsoInfoUSAWUrl,
  wsoDisplayName,
} from './RoutesAndSettings';
import wsoConfig from './wsoConfig.json';
import { findInvalidConfigFields } from '../Utils/SettingsUtils';

describe('RoutesAndSettings (user-based)', () => {
  describe('route builders', () => {
    test('getRankingsRoute defaults to a limit of 3', () => {
      expect(getRankingsRoute()).toContain('l=3');
    });

    test('getRankingsRoute honors a positive count', () => {
      expect(getRankingsRoute(7)).toContain('l=7');
    });

    test('getRankingsRoute falls back to 3 for non-positive counts', () => {
      expect(getRankingsRoute(0)).toContain('l=3');
      expect(getRankingsRoute(-1)).toContain('l=3');
    });

    test('B-12: getLifterId extracts the public id from the member URL', () => {
      const action = [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/12345' }];
      expect(getLifterId(action)).toBe('12345');
    });

    test('getLifterDataRoute embeds the lifter id', () => {
      expect(getLifterDataRoute('98765')).toContain('/athletes/98765/table/data');
    });

    test('getIndividualMeetResultsRoute defaults to a limit of 50 and embeds the event id', () => {
      const route = getIndividualMeetResultsRoute('555');
      expect(route).toContain('/api/meet-results/555/');
      expect(route).toContain('l=50');
      expect(getIndividualMeetResultsRoute('555', 400)).toContain('l=400');
    });

    test('getMeetsRoute defaults to a limit of 30', () => {
      expect(getMeetsRoute()).toContain('i=30');
      expect(getMeetsRoute(200)).toContain('i=200');
    });

    test('getLocalMeetByNameRoute URL-encodes the meet name', () => {
      const route = getLocalMeetByNameRoute('Sacramento Open & Friends');
      expect(route).toContain('s=Sacramento%20Open%20%26%20Friends');
    });

    test('getSheetRoute contains the sheet id and tab name', () => {
      const route = getSheetRoute('sheet-id-123', 'Raw_Data');
      expect(route).toContain('/sheet-id-123/values/Raw_Data');
      expect(route).toContain('https://sheets.googleapis.com/v4/spreadsheets');
    });
  });

  describe('B-16: historical record sheet tabs', () => {
    test('priorRecordsSheetNames is a list of tab names', () => {
      expect(Array.isArray(priorRecordsSheetNames)).toBe(true);
      priorRecordsSheetNames.forEach((name) => expect(name.trim()).not.toBe(''));
    });
  });

  describe('A-04 / D-01 / E-02 / E-03: external links', () => {
    test('WSO site links are web URLs', () => {
      expect(localScheduleUrl).toMatch(/^https?:\/\//);
      expect(localHomeUrl).toMatch(/^https?:\/\//);
    });

    test('USAW public rankings site link', () => {
      expect(usawRankingsPublicSiteLink).toBe(
        'https://usaweightlifting.sport80.com/public/rankings/all'
      );
    });

    test('About page links', () => {
      expect(americanRecordsUrl).toBe('https://www.usaweightlifting.org/american-records');
      expect(wsoInfoUSAWUrl).toMatch(/^https?:\/\//);
      expect(githubUrl).toBe('https://github.com/brigittebieyro/records-explorer');
    });

    test('the public spreadsheet link points at the current records sheet', () => {
      expect(publicSpreadsheetLink).toBe(
        `https://docs.google.com/spreadsheets/d/${currentRecordsSheetId}`
      );
    });

    test('maintainer email is a string', () => {
      expect(typeof maintainerEmail).toBe('string');
    });
  });

  describe('G-04: plausibility caps', () => {
    test('caps are 200 snatch / 280 clean & jerk / 470 total', () => {
      expect(maxSnatch).toBe(200);
      expect(maxCleanAndJerk).toBe(280);
      expect(maxTotal).toBe(470);
    });
  });

  describe('C-01: local meet settings', () => {
    test('local meets are searched from 2026-01-01', () => {
      expect(localMeetStartDate).toBe('2026-01-01');
    });

    test('local meets are searched by a list of regions and state names', () => {
      expect(Array.isArray(wsoRegions)).toBe(true);
      expect(Array.isArray(wsoStateNames)).toBe(true);
    });

    test('the WSO boundary, when set, is a box with north above south and east of west', () => {
      if (!wsoBoundary) return;
      expect(wsoBoundary.north).toBeGreaterThan(wsoBoundary.south);
      expect(wsoBoundary.east).toBeGreaterThan(wsoBoundary.west);
    });
  });

  describe('D-01: nationals qualification date range', () => {
    // Nationals is 2027-03-07, qualifying window 2026-02-04 through 2027-02-04. Instants are noon
    // UTC, which is the same calendar day in every US time zone.
    test('well before Nationals, the official qualifying window is used', () => {
      expect(getNationalsDateRange(new Date('2026-08-29T12:00:00Z'))).toEqual({
        startDate: nationalsQualifyingStartDate,
        endDate: nationalsQualifyingEndDate,
      });
    });

    test('the qualifying window still applies on the day of Nationals', () => {
      expect(getNationalsDateRange(new Date('2027-03-07T12:00:00Z'))).toEqual({
        startDate: nationalsQualifyingStartDate,
        endDate: nationalsQualifyingEndDate,
      });
    });

    test('once Nationals has passed, the range falls back to the last 16 months', () => {
      expect(getNationalsDateRange(new Date('2027-03-08T12:00:00Z'))).toEqual({
        startDate: '2025-11-08',
        endDate: '2027-03-09',
      });
    });
  });

  describe('F-11: rolling months date range', () => {
    test('the window runs from the given number of months back through tomorrow', () => {
      expect(getRecentMonthsDateRange(12, new Date('2026-09-29T12:00:00Z'))).toEqual({
        startDate: '2025-09-29',
        endDate: '2026-09-30',
      });
    });

    test('a single month is a real window', () => {
      expect(getRecentMonthsDateRange(1, new Date('2026-09-29T12:00:00Z'))).toEqual({
        startDate: '2026-08-29',
        endDate: '2026-09-30',
      });
    });

    test('month arithmetic on a short month widens the window rather than narrowing it', () => {
      // There is no May 31 three months before Aug 31, so the date rolls into June.
      expect(getRecentMonthsDateRange(3, new Date('2026-05-31T12:00:00Z')).startDate).toBe(
        '2026-03-03'
      );
    });
  });

  test('the certificate title is the WSO name', () => {
    expect(certificateTitle).toBe(`${wsoDisplayName} WSO`);
  });

  /** Loads this module against `config` in place of the shipped wsoConfig.json. */
  const loadWithConfig = (config: object): typeof import('./RoutesAndSettings') => {
    let settings: typeof import('./RoutesAndSettings') | undefined;
    jest.isolateModules(() => {
      jest.doMock('./wsoConfig.json', () => config);
      settings = require('./RoutesAndSettings');
    });
    jest.dontMock('./wsoConfig.json');
    if (!settings) throw new Error('RoutesAndSettings did not load');
    return settings;
  };

  describe('optional adaptive settings', () => {
    const {
      adaptiveAllRecordsSheetName: _all,
      adaptiveCategoryRecordsSheetNames: _categories,
      adaptiveLiftersListSheetId: _rosterId,
      adaptiveLiftersListSheetName: _rosterName,
      adaptiveOptInFormUrl: _form,
      ...configWithoutAdaptive
    } = wsoConfig;

    test('a config with no adaptive settings passes the schema check', () => {
      expect(findInvalidConfigFields(configWithoutAdaptive, configSchema)).toEqual([]);
    });

    test('with no adaptive settings, the page, menu item and script are all unavailable', () => {
      const settings = loadWithConfig({
        ...configWithoutAdaptive,
        showAdaptiveRecordsInMenu: true,
      });
      expect(settings.adaptiveAllRecordsSheetName).toBeUndefined();
      expect(settings.adaptiveCategories).toEqual([]);
      expect(settings.adptiveCategoryRecordsSheetNames).toEqual([]);
      expect(settings.adaptiveLiftersListSheetId).toBeUndefined();
      expect(settings.adaptiveLiftersListSheetName).toBeUndefined();
      expect(settings.adaptiveOptInFormUrl).toBeUndefined();
      expect(settings.adaptiveRecordsPageAvailable).toBe(false);
      expect(settings.showAdaptiveRecordsInMenu).toBe(false);
      expect(settings.adaptiveRecordsScriptAvailable).toBe(false);
    });

    test('only the categories with a tab are listed, in category order, and a blank tab counts as none', () => {
      const settings = loadWithConfig({
        ...configWithoutAdaptive,
        adaptiveCategoryRecordsSheetNames: { cognitive: 'Cog', hearing: '  ', vision: 'Vis' },
      });
      expect(settings.adaptiveCategories.map((category) => category.id)).toEqual(['Vis', 'Cog']);
      expect(settings.adaptiveCategories[0].displayName).toBe('Visual Impairment');
      expect(settings.adptiveCategoryRecordsSheetNames).toEqual(['Vis', 'Cog']);
      expect(settings.adaptiveRecordsPageAvailable).toBe(true);
    });

    test('the menu item needs both a category tab and showAdaptiveRecordsInMenu', () => {
      const withCategory = {
        ...configWithoutAdaptive,
        adaptiveCategoryRecordsSheetNames: { physical: 'Phys' },
      };
      expect(
        loadWithConfig({ ...withCategory, showAdaptiveRecordsInMenu: true })
          .showAdaptiveRecordsInMenu
      ).toBe(true);
      expect(
        loadWithConfig({ ...withCategory, showAdaptiveRecordsInMenu: false })
          .showAdaptiveRecordsInMenu
      ).toBe(false);
      expect(
        loadWithConfig({ ...configWithoutAdaptive, adaptiveAllRecordsSheetName: 'All' })
          .showAdaptiveRecordsInMenu
      ).toBe(false);
    });

    test('the script needs the roster sheet and at least one adaptive records tab', () => {
      const roster = { adaptiveLiftersListSheetId: 'id', adaptiveLiftersListSheetName: 'tab' };
      expect(
        loadWithConfig({ ...configWithoutAdaptive, ...roster }).adaptiveRecordsScriptAvailable
      ).toBe(false);
      expect(
        loadWithConfig({
          ...configWithoutAdaptive,
          adaptiveAllRecordsSheetName: 'All',
          adaptiveLiftersListSheetId: 'id',
        }).adaptiveRecordsScriptAvailable
      ).toBe(false);

      const combinedOnly = loadWithConfig({
        ...configWithoutAdaptive,
        ...roster,
        adaptiveAllRecordsSheetName: 'All',
      });
      expect(combinedOnly.adaptiveRecordsScriptAvailable).toBe(true);
      expect(combinedOnly.adaptiveRecordsPageAvailable).toBe(false);
    });
  });

  describe('WSO names', () => {
    test('the display name is the official name when the config has no wsoDisplayName', () => {
      const { wsoDisplayName: displayName, wsoOfficialName: officialName } = loadWithConfig({
        ...wsoConfig,
        wsoOfficialName: 'Official Name',
      });
      expect(officialName).toBe('Official Name');
      expect(displayName).toBe('Official Name');
    });

    test('the display name is wsoDisplayName when the config has one', () => {
      const settings = loadWithConfig({
        ...wsoConfig,
        wsoOfficialName: 'Official Name',
        wsoDisplayName: 'Display Name',
      });
      expect(settings.wsoOfficialName).toBe('Official Name');
      expect(settings.wsoDisplayName).toBe('Display Name');
      expect(settings.certificateTitle).toBe('Display Name WSO');
    });
  });

  describe('toRecordDate', () => {
    test('is a YYYY-MM-DD day', () => {
      expect(toRecordDate(new Date('2026-09-29T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('names the day in the record time zone, not the UTC day', () => {
      const instant = new Date('2026-09-30T03:30:00Z');
      const expected = new Intl.DateTimeFormat('en-CA', {
        timeZone: wsoConfig.recordTimeZone,
      }).format(instant);
      expect(toRecordDate(instant)).toBe(expected);
    });
  });

  describe('wsoConfig.json shape', () => {
    test('the shipped config matches the config schema', () => {
      expect(findInvalidConfigFields(wsoConfig, configSchema)).toEqual([]);
    });
  });
});
