import { ConfigFactory } from './config-factory.interface';
import { DotenvExpandOptions } from 'dotenv-expand'

/**
 * @publicApi
 */
export interface ConfigModuleOptions {
  /**
   * If "true", values from the process.env object will be cached in the memory.
   * This improves the overall application performance.
   * See: https://github.com/nodejs/node/issues/3104
   */
  cache?: boolean;

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
   * Custom function to validate environment variables. It takes an object containing environment
   * variables as input and outputs validated environment variables.
   * If exception is thrown in the function it would prevent the application from bootstrapping.
   * Also, environment variables can be edited through this function, changes
   * will be reflected in the process.env object.
   */
  validate?: (config: Record<string, any>) => Record<string, any>;

  /**
   * Environment variables validation schema (Joi).
   */
  validationSchema?: any;

  /**
   * Schema validation options.
   * See: https://joi.dev/api/?v=17.3.0#anyvalidatevalue-options
   */
  validationOptions?: Record<string, any>;

  /**
   * Array of custom configuration files to be loaded.
   * See: https://docs.nestjs.com/techniques/configuration
   */
  load?: Array<ConfigFactory>;

  /**
   * A boolean value indicating the use of expanded variables, or object
   * containing options to pass to dotenv-expand.
   * If .env contains expanded variables, they'll only be parsed if
   * this property is set to true.
   */
  expandVariables?: boolean | DotenvExpandOptions;
}
