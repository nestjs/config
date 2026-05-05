import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Validates config using a Standard Schema (e.g. Zod, Arktype).
 * @see https://standardschema.dev/
 */
export function validateWithStandardSchema(
  schema: StandardSchemaV1,
  config: Record<string, any>,
  options: StandardSchemaV1.Options = {},
): { error?: Error; value: Record<string, any> } {
  const result = schema['~standard'].validate(config, options);
  if (result instanceof Promise) {
    throw new Error('Async validation is not supported');
  }
  if ('value' in result) {
    return { value: result.value as Record<string, any>, error: undefined };
  }
  return {
    error: new Error(JSON.stringify(result.issues, null, 2)),
    value: config,
  };
}
