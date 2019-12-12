import { ConfigFactory } from './config-factory.interface';

export interface ConfigModuleOptions {
  isGlobal?: boolean;
  ignoreEnvFile?: boolean;
  envFilePath?: string;
  encoding?: string;
  validationSchema?: any;
  load?: Array<ConfigFactory>;
}
