import type { ZodType } from '../types/zod.type';
import { ValidationOptions } from '../interfaces/validation-schema.interface';
import { Validator } from './abstract.validator';

/**
 * Zod validation schema adapter
 * @publicApi
 */
export class ZodValidator extends Validator {
  constructor(
    private schema: ZodType,
    private options?: ValidationOptions,
  ) {
    super();
  }

  validate(
    config: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: ValidationOptions,
  ): { error?: Error; value: Record<string, any> } {
    try {
      const value = this.schema.parse(config) as Record<string, any>;
      return this.succeed(value);
    } catch (error) {
      return this.failed(error, config);
    }
  }

  succeed(value: unknown): {
    error?: Error;
    value: Record<string, any>;
  } {
    return {
      value: value as Record<string, any>,
      error: undefined,
    };
  }
}
