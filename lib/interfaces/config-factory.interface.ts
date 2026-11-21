import { ConfigObject } from '../types/index.js';

type ConfigFactoryReturnValue<T extends ConfigObject> = T | Promise<T>;

/**
 * @param env the environment variables, as validated (and converted) by
 * "validationSchema" or "validate"; "process.env" if neither is set.
 * Only passed to factories in "load"; undefined in "forFeature()" and "asProvider()"
 */
export type ConfigFactory<T extends ConfigObject = ConfigObject> = (
  env?: Record<string, any>,
) => ConfigFactoryReturnValue<T>;
