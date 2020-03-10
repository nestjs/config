import { ConfigFactory } from './config-factory.interface';

export interface ConfigModuleOptions {
  /**
   * If "true", registers `ConfigModule` as a global module.
   * See: https://docs.nestjs.com/modules#global-modules
   */
  isGlobal?: boolean;

  /**
   * If "true", environment files (`.env`) will be ignored.
   */
  ignoreEnvFile?: boolean;

  /**
   * If "true", predefined environment variables will not be validated.
   */
  ignoreEnvVars?: boolean;

  /**
   * Path to the environment file(s) to be loaded.
   */
  envFilePath?: string | string[];

  /**
   * Environment file encoding.
   */
  encoding?: string;

  /**
   * Environment variables validation schema (Joi).
   */
  validationSchema?: any;

  /**
   * Schema validation options.
   * See: https://hapi.dev/family/joi/?v=16.1.8#anyvalidatevalue-options
   */
  validationOptions?: Record<string, any>;

  /**
   * Array of custom configuration files to be loaded.
   * See: https://docs.nestjs.com/techniques/configuration
   */
  load?: Array<ConfigFactory>;

  /**
   * A boolean value indicating the use of expanded variables.
   * If .env contains expanded variables, they'll only be parsed if
   * this property is set to true.
   */
  expandVariables?: boolean;
}
