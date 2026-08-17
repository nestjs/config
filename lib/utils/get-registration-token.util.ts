import { PARTIAL_CONFIGURATION_KEY } from '../config.constants.js';

/**
 * @publicApi
 */
export function getRegistrationToken(config: Record<string, any>) {
  return config[PARTIAL_CONFIGURATION_KEY];
}
