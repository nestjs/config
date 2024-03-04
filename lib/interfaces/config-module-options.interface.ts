import { DotenvExpandOptions } from 'dotenv-expand';
import { ConfigFactory } from './config-factory.interface';
import { Parser } from '../types';

/**
 * @publicApi
 */
export interface ConfigModuleOptions<
  ValidationOptions extends Record<string, any> = Record<string, any>,
> {
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
   * @deprecated Use `validatePredefined` instead.
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
   * If "true", predefined environment variables will be validated.
   * Predefined environment variables are process variables (process.env variables) that were set before the module was imported.
   * For example, if you start your application with `PORT=3000 node main.js`, then `PORT` is a predefined environment variable.
   * Variables that were loaded by the `ConfigModule` from the .env file are not considered predefined.
   * @default true
   */
  validatePredefined?: boolean;

  /**
   * If "true", process environment variables (process.env) will be ignored and not picked up by the `ConfigService#get` method.
   * @default false
   */
  skipProcessEnv?: boolean;

  /**
   * Environment variables validation schema (Joi).
   */
  validationSchema?: any;

  /**
   * Schema validation options.
   * See: https://joi.dev/api/?v=17.3.0#anyvalidatevalue-options
   */
  validationOptions?: ValidationOptions;

  /**
   * Array of custom configuration files to be loaded.
   * See: https://docs.nestjs.com/techniques/configuration
   */
  load?: Array<ConfigFactory | Promise<ConfigFactory>>;

  /**
   * A boolean value indicating the use of expanded variables, or object
   * containing options to pass to dotenv-expand.
   * If .env contains expanded variables, they'll only be parsed if
   * this property is set to true.
   */
  expandVariables?: boolean | DotenvExpandOptions;

  /**
   * A function used to parse a buffer into a configuration object.
   */
  parser?: Parser;
}
