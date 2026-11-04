import type { StandardSchemaV1 } from '@standard-schema/spec';
import { getProperty } from './property-path.util.js';

/**
 * Joi defaults to `allowUnknown: false` and `abortEarly: true`, which would
 * reject the unrelated variables that are always present in `process.env` and
 * report only the first failure. Previous versions of this package overrode
 * both, so they remain the defaults for Joi schemas unless the user opts out.
 *
 * Joi's `pattern()` messages also quote the rejected value (`with value
 * {:[.]}`), after any conversion the schema applied to it. The default
 * templates below leave it out, so that a secret that fails its format rule
 * doesn't end up in the bootstrap error (and the logs).
 */
const JOI_DEFAULT_LIBRARY_OPTIONS = {
  abortEarly: false,
  allowUnknown: true,
};
const JOI_DEFAULT_MESSAGES = {
  'string.pattern.base':
    '{{#label}} fails to match the required pattern: {{#regex}}',
  'string.pattern.name': '{{#label}} fails to match the {{#name}} pattern',
  'string.pattern.invert.base':
    '{{#label}} matches the inverted pattern: {{#regex}}',
  'string.pattern.invert.name':
    '{{#label}} matches the inverted {{#name}} pattern',
};

const REDACTED = '[redacted]';

/**
 * Validates config using a Standard Schema (e.g. Zod, Arktype).
 * @see https://standardschema.dev/
 */
export async function validateWithStandardSchema(
  schema: StandardSchemaV1,
  config: Record<string, any>,
  options?: StandardSchemaV1.Options,
): Promise<{ error?: Error; value: Record<string, any> }> {
  const result = await schema['~standard'].validate(
    config,
    getLibraryOptions(schema, options),
  );

  // A falsy "issues" value indicates success, see https://standardschema.dev/
  if (result.issues) {
    return {
      error: new Error(formatIssues(result.issues, config)),
      value: config,
    };
  }
  return { value: result.value as Record<string, any> };
}

/**
 * Returns the names of the variables an object schema declares, or
 * `undefined` if they can't be told from the schema (e.g. a Zod object
 * wrapped in a "transform").
 */
export function getDeclaredKeys(
  schema: StandardSchemaV1,
): Set<string> | undefined {
  const untypedSchema = schema as any;
  try {
    const keys =
      schema['~standard'].vendor === 'joi'
        ? untypedSchema.describe?.().keys
        : // Zod and Valibot objects
          (untypedSchema.shape ?? untypedSchema.entries);
    return keys && typeof keys === 'object'
      ? new Set(Object.keys(keys))
      : undefined;
  } catch {
    return undefined;
  }
}

function getLibraryOptions(
  schema: StandardSchemaV1,
  options?: StandardSchemaV1.Options,
): StandardSchemaV1.Options | undefined {
  if (schema['~standard'].vendor !== 'joi') {
    return options;
  }
  const libraryOptions = options?.libraryOptions as
    Record<string, any> | undefined;
  return {
    ...options,
    libraryOptions: {
      ...JOI_DEFAULT_LIBRARY_OPTIONS,
      ...libraryOptions,
      messages: { ...JOI_DEFAULT_MESSAGES, ...libraryOptions?.messages },
    },
  };
}

function formatIssues(
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
  config: Record<string, any>,
): string {
  return issues
    .map(issue => {
      const message = redactValue(issue.message, getIssueValue(issue, config));
      const path = formatIssuePath(issue.path);
      return path ? `${path}: ${message}` : message;
    })
    .join('\n');
}

function getIssueValue(
  issue: StandardSchemaV1.Issue,
  config: Record<string, any>,
): unknown {
  let value: unknown = config;
  for (const segment of issue.path ?? []) {
    value = getProperty(
      value,
      typeof segment === 'object' && segment !== null ? segment.key : segment,
    );
  }
  return issue.path?.length ? value : undefined;
}

/**
 * Takes the rejected value out of the message (some schema libraries quote
 * it), as it may be a secret that only has a typo
 */
function redactValue(message: string, value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    return message;
  }
  return [JSON.stringify(value), `"${value}"`, `'${value}'`].reduce(
    (result, quoted) => result.split(quoted).join(REDACTED),
    message,
  );
}

function formatIssuePath(path: StandardSchemaV1.Issue['path']): string {
  return (path ?? [])
    .map(segment =>
      typeof segment === 'object' && segment !== null
        ? String(segment.key)
        : String(segment),
    )
    .join('.');
}
