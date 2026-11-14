// Checks a settings object, such as wsoConfig.json, against a schema written like a TypeScript type.

/** The value types a schema field can name. */
export type ScalarSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'WebUrl' | 'IsoDate';

/** A scalar type, or an array of one, e.g. 'string[]'. */
export type SchemaType = ScalarSchemaType | `${ScalarSchemaType}[]`;

/**
 * A field name maps to a type name or to a nested schema. A name ending in '?' is optional, as in
 * a TypeScript type: `{ wsoName: 'string', 'nickname?': 'string' }`.
 */
export interface ConfigSchema {
  [field: string]: SchemaType | ConfigSchema;
}

const scalarChecks: Record<ScalarSchemaType, (value: unknown) => boolean> = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  integer: (value) => Number.isInteger(value),
  boolean: (value) => typeof value === 'boolean',
  WebUrl: (value) => typeof value === 'string' && /^https?:\/\//.test(value),
  IsoDate: (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether `value` is of the type `type` names. */
export const matchesSchemaType = (value: unknown, type: SchemaType): boolean => {
  if (type.endsWith('[]')) {
    const check = scalarChecks[type.slice(0, -2) as ScalarSchemaType];
    return Array.isArray(value) && value.every(check);
  }
  return scalarChecks[type as ScalarSchemaType](value);
};

/**
 * Walks `schema` and returns the dotted path of every field in `config` that is missing (and not
 * optional) or of the wrong type, e.g. ['wsoId', 'wsoBoundary.east']. Fields in `config` that the
 * schema does not name are ignored.
 */
export const findInvalidConfigFields = (
  config: unknown,
  schema: ConfigSchema,
  pathPrefix = ''
): string[] => {
  const record = isPlainObject(config) ? config : {};
  return Object.entries(schema).flatMap(([schemaKey, type]) => {
    const isOptional = schemaKey.endsWith('?');
    const field = isOptional ? schemaKey.slice(0, -1) : schemaKey;
    const path = `${pathPrefix}${field}`;
    const value = record[field];

    if (value === undefined) {
      return isOptional ? [] : [path];
    }
    if (typeof type === 'string') {
      return matchesSchemaType(value, type) ? [] : [path];
    }
    return isPlainObject(value) ? findInvalidConfigFields(value, type, `${path}.`) : [path];
  });
};

/**
 * Throws, naming every invalid field, when `config` does not match `schema`. Only checks shape:
 * the values are the deployment's to choose. `sourceName` names the config in the message.
 */
export const assertConfigMatchesSchema = (
  config: unknown,
  schema: ConfigSchema,
  sourceName: string
): void => {
  const invalidFields = findInvalidConfigFields(config, schema);
  if (invalidFields.length > 0) {
    throw new Error(`${sourceName} has missing or malformed fields: ${invalidFields.join(', ')}`);
  }
};
