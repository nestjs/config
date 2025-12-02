import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Validator } from './abstract.validator';

/**
 * Standard Schema adapter
 * @see https://standardschema.dev/
 * @publicApi
 */
export class StandardValidator extends Validator {
  constructor(private schema: StandardSchemaV1<any, any>) {
    super();
  }

  validate(config: StandardSchemaV1): {
    error?: Error;
    value: Record<string, any>;
  } {
    const result = this.schema['~standard'].validate(config);
    if (result instanceof Promise) {
      throw new Error('Expected sync result');
    }
    if ('value' in result) {
      return this.succeed(result.value);
    }

    return this.failed(
      new Error(JSON.stringify(result.issues, null, 2)),
      config,
    );
  }
}
