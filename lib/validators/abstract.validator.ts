/**
 * @publicApi
 */
export abstract class Validator {
  validate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: Record<string, any>,
  ): { error?: Error; value: Record<string, any> } {
    throw new Error('Please implement the validate method');
  }

  succeed(result: unknown): {
    error?: Error;
    value: Record<string, any>;
  } {
    return {
      value: result as Record<string, any>,
      error: undefined,
    };
  }

  failed(
    error: Error,
    config: Record<string, any>,
  ): {
    error: Error;
    value: Record<string, any>;
  } {
    return {
      error,
      value: config,
    };
  }
}
