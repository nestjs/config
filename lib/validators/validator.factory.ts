import type {
  StandardSchemaV1,
  ValidationSchema,
  JoiSchema,
} from '../interfaces/validation-schema.interface';
import { Validator } from './abstract.validator';
import { JoiValidator } from './joi.validator';
import { StandardValidator } from './standard.validator';

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
   * Creates a standard schema validator
   * @param schema Standard schema
   * @returns StandardValidator instance
   */
  static createStandardValidator(schema: StandardSchemaV1): Validator {
    return new StandardValidator(schema);
  }

  /**
   * Creates a validator from a schema object
   * Automatically detects the schema type based on the schema object
   * @param schema Schema object (Joi or a schema that conforms to @standard-schema/spec)
   * @returns ValidationSchema instance
   */
  static createValidator(schema: ValidationSchema): Validator {
    // Check if it's a validator instance
    if (schema instanceof Validator) {
      return schema;
    }

    // Check if it's a standard schema first
    if (schema && typeof schema === 'object' && '~standard' in schema) {
      return this.createStandardValidator(schema as StandardSchemaV1);
    }

    return this.createJoiValidator(schema);
  }
}
