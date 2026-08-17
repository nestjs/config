import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Joi defaults to `allowUnknown: false` and `abortEarly: true`, which would
 * reject the unrelated variables that are always present in `process.env` and
 * report only the first failure. Previous versions of this package overrode
 * both, so they remain the defaults for Joi schemas unless the user opts out.
 */
const JOI_DEFAULT_LIBRARY_OPTIONS = {
  abortEarly: false,
  allowUnknown: true,
};

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
    return { error: new Error(formatIssues(result.issues)), value: config };
  }
  return { value: result.value as Record<string, any> };
}

function getLibraryOptions(
  schema: StandardSchemaV1,
  options?: StandardSchemaV1.Options,
): StandardSchemaV1.Options | undefined {
  if (schema['~standard'].vendor !== 'joi') {
    return options;
  }
  return {
    ...options,
    libraryOptions: {
      ...JOI_DEFAULT_LIBRARY_OPTIONS,
      ...options?.libraryOptions,
    },
  };
}

function formatIssues(issues: ReadonlyArray<StandardSchemaV1.Issue>): string {
  return issues
    .map(issue => {
      const path = formatIssuePath(issue.path);
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('\n');
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
