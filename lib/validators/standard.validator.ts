import type { StandardSchemaV1 } from '@standard-schema/spec';

import { ValidationOptions } from '../interfaces/validation-schema.interface';
import { Validator } from './abstract.validator';

/**
 * Standard Schema adapter
 * @publicApi
 */
export class StandardValidator extends Validator {
  constructor(
    private schema: StandardSchemaV1<any, any>,
    private _options?: ValidationOptions,
  ) {
    super();
  }

  validate(
    config: StandardSchemaV1.Props<unknown, Record<string, any>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: ValidationOptions,
  ): { error?: Error; value: Record<string, any> } {
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
