import { type StandardSchemaV1 } from '@standard-schema/spec';
import { type Schema as JoiSchema } from 'joi';

export { StandardSchemaV1 };
export { JoiSchema };
/**
 * @publicApi
 */
export type ValidationSchema = JoiSchema | StandardSchemaV1;
/**
 * @publicApi
 */
export interface ValidationOptions {
  /**
   * [Joi] Whether to allow unknown properties
   * @default true
   */
  allowUnknown?: boolean;

  /**
   * [Joi] Whether to abort validation on first error
   * @default false
   */
  abortEarly?: boolean;

  /**
   * Additional validation options specific to the validation library
   */
  [key: string]: any;
}
