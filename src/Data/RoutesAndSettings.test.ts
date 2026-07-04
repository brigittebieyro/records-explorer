import {
  americanRecordsUrl,
  getIndividualMeetResultsRoute,
  getLifterDataRoute,
  getLifterId,
  getLocalMeetByNameRoute,
  getMeetsRoute,
  getRankingsRoute,
  getSheetRoute,
  githubUrl,
  localHomeUrl,
  localMeetStartDate,
  localScheduleUrl,
  maintainerEmail,
  maxCleanAndJerk,
  maxSnatch,
  maxTotal,
  priorRecordsSheetNames,
  publicSpreadsheetLink,
  usawRankingsPublicSiteLink,
  wsoBoundary,
  wsoInfoUSAWUrl,
  wsoName,
} from './RoutesAndSettings';

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
    test('priorRecordsSheetNames lists the three history tabs', () => {
      expect(priorRecordsSheetNames).toEqual(['Pre-Aug2026', 'Pre-June2025', 'Pre-2018']);
    });
  });

  describe('A-04 / D-01 / E-02 / E-03: external links', () => {
    test('WSO site links', () => {
      expect(localScheduleUrl).toBe('https://canorthcentralwso.org/meet-schedule');
      expect(localHomeUrl).toBe('https://canorthcentralwso.org');
    });

    test('USAW public rankings site link', () => {
      expect(usawRankingsPublicSiteLink).toBe(
        'https://usaweightlifting.sport80.com/public/rankings/all'
      );
    });

    test('About page links', () => {
      expect(americanRecordsUrl).toBe('https://www.usaweightlifting.org/american-records');
      expect(wsoInfoUSAWUrl).toBe(
        'https://www.usaweightlifting.org/club-wso/wso-information/california-north-central'
      );
      expect(githubUrl).toBe('https://github.com/brigittebieyro/records-explorer');
      expect(publicSpreadsheetLink).toContain('https://docs.google.com/spreadsheets/d/');
    });

    test('maintainer email is set', () => {
      expect(maintainerEmail).toBe('brigitte.bieyro@gmail.com');
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

    test('the WSO boundary covers northern/central California', () => {
      expect(wsoBoundary.north).toBeGreaterThan(wsoBoundary.south);
      expect(wsoBoundary.east).toBeGreaterThan(wsoBoundary.west);
      expect(wsoBoundary).toEqual({ north: 42.01, south: 34.79, west: -124.41, east: -114.13 });
    });
  });

  test('the WSO identity is California North Central', () => {
    expect(wsoName).toBe('California North Central');
  });
});
