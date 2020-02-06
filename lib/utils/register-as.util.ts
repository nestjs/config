import {
  PARTIAL_CONFIGURATION_KEY,
  PARTIAL_CONFIGURATION_PROPNAME,
} from '../config.constants';
import { ConfigFactory } from '../interfaces';
import { getConfigToken } from './get-config-token.util';

export type ConfigFactoryKeyHost = { KEY: string };

/**
 * Registers the configuration object behind a specified token.
 */
export function registerAs<T extends ConfigFactory = ConfigFactory>(
  token: string,
  configFactory: T,
): T & ConfigFactoryKeyHost {
  Object.defineProperty(configFactory, PARTIAL_CONFIGURATION_KEY, {
    configurable: false,
    enumerable: false,
    value: token,
    writable: false,
  });
  Object.defineProperty(configFactory, PARTIAL_CONFIGURATION_PROPNAME, {
    configurable: false,
    enumerable: false,
    value: getConfigToken(token),
    writable: false,
  });

  return configFactory as T & ConfigFactoryKeyHost;
}
