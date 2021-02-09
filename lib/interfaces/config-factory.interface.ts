import { ConfigObject } from '../types';

type ConfigFactoryReturnValue<T extends ConfigObject> = T | Promise<T>;

export type ConfigFactory<
  T extends ConfigObject = ConfigObject
> = () => ConfigFactoryReturnValue<T>;
