import { ConfigFactory } from './config-factory.interface';

export interface ConfigModuleOptions {
  /**
   * If "true", registers `ConfigModule` as a global module.
   * See: https://docs.nestjs.com/modules#global-modules
   */
  isGlobal?: boolean;

  /**
   * If "true", envirionment files (`.env`) will be ignored.
   */
  ignoreEnvFile?: boolean;

  /**
   * Path to the envirionment file to be loaded.
   */
  envFilePath?: string;

  /**
   * Environment file encoding.
   */
  encoding?: string;

  /**
   * Environment variables validation schema (Joi).
   */
  validationSchema?: any;

  /**
   * Array of custom configuration files to be loaded.
   * See: https://docs.nestjs.com/techniques/configuration
   */
  load?: Array<ConfigFactory>;
}
