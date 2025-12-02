import type {
  ValidationOptions,
  JoiSchema,
} from '../interfaces/validation-schema.interface';
import { Validator } from './abstract.validator';

/**
 * Joi validation schema adapter
 * @see https://joi.dev/api
 * @publicApi
 */
export class JoiValidator extends Validator {
  constructor(private schema: JoiSchema) {
    super();
  }

  validate(
    config: Record<string, any>,
    validationOptions?: ValidationOptions,
  ): { error?: Error; value: Record<string, any> } {
    const { error, value } = this.schema.validate(config, validationOptions);
    if (error) {
      return this.failed(error, config);
    }

    return this.succeed(value);
  }
}
