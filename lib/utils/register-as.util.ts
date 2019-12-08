import { CONFIGURATION_NAMESPACE } from '../config.constants';

/**
 * Registers the configuration object behind a specified token.
 */
export function registerAs(token: string, config: Record<string, any>) {
  Object.defineProperty(config, CONFIGURATION_NAMESPACE, {
    configurable: false,
    enumerable: false,
    value: token,
    writable: false,
  });
  return config;
}
