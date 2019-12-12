import { PARTIAL_CONFIGURATION_KEY } from '../config.constants';
import { ConfigFactory } from '../interfaces';

/**
 * Registers the configuration object behind a specified token.
 */
export function registerAs(token: string, configFactory: ConfigFactory) {
  Object.defineProperty(configFactory, PARTIAL_CONFIGURATION_KEY, {
    configurable: false,
    enumerable: false,
    value: token,
    writable: false,
  });
  return configFactory;
}
