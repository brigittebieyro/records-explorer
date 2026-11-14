import {
  assertConfigMatchesSchema,
  ConfigSchema,
  findInvalidConfigFields,
  matchesSchemaType,
} from './SettingsUtils';

const schema: ConfigSchema = {
  name: 'string',
  count: 'integer',
  enabled: 'boolean',
  homeUrl: 'WebUrl',
  startDate: 'IsoDate',
  tags: 'string[]',
  'nickname?': 'string',
  box: { north: 'number', south: 'number', 'label?': 'string' },
};

const validConfig = {
  name: 'Example WSO',
  count: 21,
  enabled: true,
  homeUrl: 'https://example.org',
  startDate: '1998-01-01',
  tags: ['a', 'b'],
  box: { north: 42.01, south: 34.79 },
};

describe('SettingsUtils', () => {
  describe('matchesSchemaType', () => {
    test('scalar types', () => {
      expect(matchesSchemaType('x', 'string')).toBe(true);
      expect(matchesSchemaType(1, 'string')).toBe(false);
      expect(matchesSchemaType(1.5, 'number')).toBe(true);
      expect(matchesSchemaType(NaN, 'number')).toBe(false);
      expect(matchesSchemaType(21, 'integer')).toBe(true);
      expect(matchesSchemaType(21.5, 'integer')).toBe(false);
      expect(matchesSchemaType(false, 'boolean')).toBe(true);
      expect(matchesSchemaType('false', 'boolean')).toBe(false);
    });

    test('WebUrl needs an http(s) scheme', () => {
      expect(matchesSchemaType('https://example.org', 'WebUrl')).toBe(true);
      expect(matchesSchemaType('http://example.org', 'WebUrl')).toBe(true);
      expect(matchesSchemaType('example.org', 'WebUrl')).toBe(false);
    });

    test('IsoDate is YYYY-MM-DD', () => {
      expect(matchesSchemaType('2026-01-01', 'IsoDate')).toBe(true);
      expect(matchesSchemaType('01/01/2026', 'IsoDate')).toBe(false);
    });

    test('array types check every element', () => {
      expect(matchesSchemaType([], 'string[]')).toBe(true);
      expect(matchesSchemaType(['a', 'b'], 'string[]')).toBe(true);
      expect(matchesSchemaType(['a', 2], 'string[]')).toBe(false);
      expect(matchesSchemaType('a', 'string[]')).toBe(false);
      expect(matchesSchemaType([1, 2], 'number[]')).toBe(true);
    });
  });

  describe('findInvalidConfigFields', () => {
    test('a valid config has no invalid fields', () => {
      expect(findInvalidConfigFields(validConfig, schema)).toEqual([]);
    });

    test('a missing required field is reported', () => {
      const { count: _omit, ...withoutCount } = validConfig;
      expect(findInvalidConfigFields(withoutCount, schema)).toEqual(['count']);
    });

    test('a field of the wrong type is reported', () => {
      expect(findInvalidConfigFields({ ...validConfig, homeUrl: 'example.org' }, schema)).toEqual([
        'homeUrl',
      ]);
    });

    test('an optional field may be absent, but is checked when present', () => {
      expect(findInvalidConfigFields(validConfig, schema)).not.toContain('nickname');
      expect(findInvalidConfigFields({ ...validConfig, nickname: 'Norcal' }, schema)).toEqual([]);
      expect(findInvalidConfigFields({ ...validConfig, nickname: 7 }, schema)).toEqual([
        'nickname',
      ]);
    });

    test('nested schemas report dotted paths', () => {
      expect(findInvalidConfigFields({ ...validConfig, box: { north: 42.01 } }, schema)).toEqual([
        'box.south',
      ]);
      expect(
        findInvalidConfigFields({ ...validConfig, box: { ...validConfig.box, label: 1 } }, schema)
      ).toEqual(['box.label']);
    });

    test('a nested schema given a non-object reports the field itself', () => {
      expect(findInvalidConfigFields({ ...validConfig, box: [42, 34] }, schema)).toEqual(['box']);
      expect(findInvalidConfigFields({ ...validConfig, box: 'north' }, schema)).toEqual(['box']);
    });

    test('fields the schema does not name are ignored', () => {
      expect(
        findInvalidConfigFields(
          { ...validConfig, somethingNew: 123, box: { ...validConfig.box, extra: true } },
          schema
        )
      ).toEqual([]);
    });

    test('a config that is not an object reports every required field', () => {
      for (const config of [null, undefined, 'config', 42, []]) {
        expect(findInvalidConfigFields(config, schema)).toEqual([
          'name',
          'count',
          'enabled',
          'homeUrl',
          'startDate',
          'tags',
          'box',
        ]);
      }
    });
  });

  describe('assertConfigMatchesSchema', () => {
    test('does not throw for a valid config', () => {
      expect(() => assertConfigMatchesSchema(validConfig, schema, 'test.json')).not.toThrow();
    });

    test('throws naming the source and every invalid field', () => {
      expect(() =>
        assertConfigMatchesSchema({ ...validConfig, count: '21', tags: 'a' }, schema, 'test.json')
      ).toThrow('test.json has missing or malformed fields: count, tags');
    });
  });
});
