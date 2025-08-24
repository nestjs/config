import { type Schema as JoiSchema } from 'joi';
import { type ValidationSchema } from '../interfaces/validation-schema.interface';
import { type ZodType } from '../types/zod.type';
import { Validator } from './abstract.validator';
import { JoiValidator } from './joi.validator';
import { ZodValidator } from './zod.validator';

/**
 * Factory for creating validation schemas
 * @publicApi
 */
export class ValidatorFactory {
  /**
   * Creates a Joi validator
   * @param schema Joi schema
   * @returns JoiValidator instance
   */
  static createJoiValidator(schema: JoiSchema): Validator {
    return new JoiValidator(schema);
  }

  /**
   * Creates a Zod validator
   * @param schema Zod schema
   * @returns ZodValidator instance
   */
  static createZodValidator(schema: ZodType): Validator {
    return new ZodValidator(schema);
  }

  /**
   * Creates a validator from a schema object
   * Automatically detects the schema type based on the schema object
   * @param schema Schema object (Joi or Zod)
   * @returns ValidationSchema instance
   */
  static createValidator(schema: ValidationSchema): Validator {
    // Check if it's a validator instance
    if (schema instanceof Validator) {
      return schema;
    }

    // Check if it's a Joi schema first
    if (
      schema &&
      typeof schema === 'object' &&
      'validate' in schema &&
      typeof schema.validate === 'function'
    ) {
      return this.createJoiValidator(schema as JoiSchema);
    }

    // Check if it's a Zod schema
    if (
      schema &&
      typeof schema === 'object' &&
      'parse' in schema &&
      typeof schema.parse === 'function'
    ) {
      return this.createZodValidator(schema as ZodType);
    }

    throw new Error(
      'Unsupported schema type. Please use Joi or Zod schema or implement the validator directly.',
    );
  }
}
