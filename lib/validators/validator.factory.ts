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
   * @returns Validator instance
   */
  static createValidator(schema: ValidationSchema): Validator {
    if (schema instanceof Validator) {
      return schema;
    }

    // Detect Joi schema by checking for the Joi-specific symbol
    // Joi schemas have a special symbol that identifies them as Joi schemas
    // Reference: https://github.com/hapijs/joi/blob/1b923c1336fb3957733b920a8290c2e2ac68dc88/lib/common.js#L124
    if (schema && !!(schema as any)[Symbol.for('@hapi/joi/schema')]) {
      return this.createJoiValidator(schema as JoiSchema);
    }

    // Detect Standard Schema by checking for the '~standard' property
    // Standard schemas conform to the @standard-schema/spec specification
    // and contain a '~standard' property with validation logic
    if (schema && typeof schema === 'object' && '~standard' in schema) {
      return this.createStandardValidator(schema as StandardSchemaV1);
    }

    // If no valid schema type is detected, throw an error
    throw new Error(
      'Unsupported schema type. Please use Joi schema, Standard Schema, or implement a custom validator.',
    );
  }
}
