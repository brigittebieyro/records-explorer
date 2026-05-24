import {
  getRankingsRoute,
  getLifterId,
  getLifterDataRoute,
  getSheetRoute,
  wsoId,
  wsoName,
  endDate,
  allTimeStartDate,
  youthAllTimeStartDate,
} from './RoutesAndSettings';

describe('RoutesAndSettings', () => {
  describe('getRankingsRoute', () => {
    test('returns route with the specified count', () => {
      expect(getRankingsRoute(5)).toContain('l=5');
    });

    test('returns route with count 10', () => {
      expect(getRankingsRoute(10)).toContain('l=10');
    });

    test('defaults to 3 when count is 0', () => {
      expect(getRankingsRoute(0)).toContain('l=3');
    });

    test('defaults to 3 for negative count', () => {
      expect(getRankingsRoute(-1)).toContain('l=3');
    });

    test('defaults to 3 for non-number input', () => {
      expect(getRankingsRoute('hello')).toContain('l=3');
    });

    test('includes rankings table path', () => {
      expect(getRankingsRoute(5)).toContain('rankings/table/data');
    });
  });

  describe('getLifterId', () => {
    test('extracts numeric ID from sport80 action URL', () => {
      const action = [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/12345' }];
      expect(getLifterId(action)).toBe('12345');
    });

    test('extracts a different numeric ID', () => {
      const action = [{ url: 'https://usaweightlifting.sport80.com/public/rankings/member/99999' }];
      expect(getLifterId(action)).toBe('99999');
    });
  });

  describe('getLifterDataRoute', () => {
    test('includes the lifter ID in the route', () => {
      expect(getLifterDataRoute('99999')).toContain('/athletes/99999/');
    });

    test('includes the table/data path', () => {
      expect(getLifterDataRoute('99999')).toContain('table/data');
    });
  });

  describe('getSheetRoute', () => {
    test('includes the sheet ID in the route', () => {
      expect(getSheetRoute('sheetId123', 'Sheet1')).toContain('sheetId123');
    });

    test('includes the sheet name in the route', () => {
      expect(getSheetRoute('sheetId123', 'Sheet1')).toContain('Sheet1');
    });

    test('includes the spreadsheets base path', () => {
      expect(getSheetRoute('sheetId123', 'Sheet1')).toContain('spreadsheets');
    });
  });

  describe('Constants', () => {
    test('wsoId is a number', () => {
      expect(typeof wsoId).toBe('number');
    });

    test('wsoName is a non-empty string', () => {
      expect(typeof wsoName).toBe('string');
      expect(wsoName.length).toBeGreaterThan(0);
    });

    test('endDate is a valid date string after 2020', () => {
      expect(new Date(endDate).getFullYear()).toBeGreaterThan(2020);
    });

    test('allTimeStartDate is before endDate', () => {
      expect(new Date(allTimeStartDate) < new Date(endDate)).toBe(true);
    });

    test('youthAllTimeStartDate is before endDate', () => {
      expect(new Date(youthAllTimeStartDate) < new Date(endDate)).toBe(true);
    });

    test('allTimeStartDate is before youthAllTimeStartDate', () => {
      expect(new Date(allTimeStartDate) < new Date(youthAllTimeStartDate)).toBe(true);
    });
  });
});
