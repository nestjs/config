import {
  ValidationOptions,
  JoiSchema,
} from '../interfaces/validation-schema.interface';
import { Validator } from './abstract.validator';

/**
 * Joi validation schema adapter with validate method
 *
 * If you need parse method instead, implement the parse method:
 *
 * parse(config: Record<string, any>, options?: ValidationOptions): Record<string, any> {
 *   const result = this.schema.validate(config, { ...this.options, ...options });
 *   if (result.error) throw result.error;
 *   return result.value;
 * }
 *
 * @publicApi
 */
export class JoiValidator extends Validator {
  constructor(private schema: JoiSchema) {
    super();
  }

  validate(
    config: Record<string, any>,
    options?: ValidationOptions,
  ): { error?: Error; value: Record<string, any> } {
    const validationOptions = {
      abortEarly: false,
      allowUnknown: true,
      ...options,
    };

    const { error, value } = this.schema.validate(config, validationOptions);
    if (error) {
      return this.failed(error, config);
    }

    return this.succeed(value);
  }
}
