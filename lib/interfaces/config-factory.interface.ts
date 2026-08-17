import { ConfigObject } from '../types/index.js';

type ConfigFactoryReturnValue<T extends ConfigObject> = T | Promise<T>;

export type ConfigFactory<T extends ConfigObject = ConfigObject> =
  () => ConfigFactoryReturnValue<T>;
