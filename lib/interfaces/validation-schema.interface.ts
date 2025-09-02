/**
 * @publicApi
 */
export interface ValidationSchema {
  /**
   * Validates the given configuration object
   * @param config The configuration object to validate
   * @param options Optional validation options
   * @returns An object containing error (if any) and validated value
   */
  validate?(
    config: Record<string, any>,
    options?: Record<string, any>,
  ): { error?: Error; value: Record<string, any> };

  /**
   * Parses and validates the given configuration object
   * @param config The configuration object to parse and validate
   * @param options Optional validation options
   * @returns The validated configuration object
   * @throws Error if validation fails
   */
  parse?(
    config: Record<string, any>,
    options?: Record<string, any>,
  ): Record<string, any>;
}

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
