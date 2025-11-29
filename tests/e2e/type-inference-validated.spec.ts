/**
 * Type tests for ConfigService with WasValidated parameter
 * Verifies fix for issue #2182: TypeScript type checking inconsistency with optional fields
 *
 * These tests use @ts-expect-error to verify that TypeScript correctly
 * detects type errors when assigning potentially undefined values to strict types.
 */
import { ConfigService } from '../../lib';

// Simulates a Zod schema with optional field: z.object({ KEY: z.string().optional() })
type ConfigWithOptional = {
  OPTIONAL_KEY: string | undefined;
  REQUIRED_KEY: string;
};

describe('Type inference with WasValidated parameter', () => {
  // These tests verify compile-time behavior using @ts-expect-error
  // If the types are wrong, the @ts-expect-error comments will cause compilation to fail

  describe('ConfigService<Config, true> (validated)', () => {
    let configService: ConfigService<ConfigWithOptional, true>;

    beforeEach(() => {
      // Mock the config service for runtime tests
      configService = {
        get: jest.fn().mockReturnValue('test-value'),
        getOrThrow: jest.fn().mockReturnValue('test-value'),
      } as unknown as ConfigService<ConfigWithOptional, true>;
    });

    it('should correctly type optional fields as string | undefined', () => {
      const value = configService.get('OPTIONAL_KEY', { infer: true });

      // Runtime test
      expect(value).toBeDefined();

      // Type test: value should be string | undefined, so this should work
      const _acceptsUndefined: string | undefined = value;

      // Type test: assigning to strict string should error
      // @ts-expect-error Type 'string | undefined' is not assignable to type 'string'
      const _strictString: string = value;
    });

    it('should correctly type required fields as string', () => {
      const value = configService.get('REQUIRED_KEY', { infer: true });

      // Runtime test
      expect(value).toBeDefined();

      // Type test: value should be string, so this should work
      const _strictString: string = value;
    });

    it('should return non-undefined type when default value is provided', () => {
      const value = configService.get('OPTIONAL_KEY', 'default', { infer: true });

      // Runtime test
      expect(value).toBeDefined();

      // Type test: with default value, result should be string (no undefined)
      const _strictString: string = value;
    });

    it('should correctly type getOrThrow as excluding undefined', () => {
      const value = configService.getOrThrow('OPTIONAL_KEY', { infer: true });

      // Runtime test
      expect(value).toBeDefined();

      // Type test: getOrThrow should exclude undefined from return type
      const _strictString: string = value;
    });
  });

  describe('ConfigService<Config, false> (not validated)', () => {
    let configService: ConfigService<ConfigWithOptional, false>;

    beforeEach(() => {
      configService = {
        get: jest.fn().mockReturnValue('test-value'),
        getOrThrow: jest.fn().mockReturnValue('test-value'),
      } as unknown as ConfigService<ConfigWithOptional, false>;
    });

    it('should add undefined to all types when not validated', () => {
      const optionalValue = configService.get('OPTIONAL_KEY', { infer: true });
      const requiredValue = configService.get('REQUIRED_KEY', { infer: true });

      // Runtime test
      expect(optionalValue).toBeDefined();
      expect(requiredValue).toBeDefined();

      // Type test: both should include undefined when WasValidated is false
      // @ts-expect-error Type 'string | undefined' is not assignable to type 'string'
      const _strictOptional: string = optionalValue;

      // @ts-expect-error Type 'string | undefined' is not assignable to type 'string'
      const _strictRequired: string = requiredValue;
    });
  });
});

