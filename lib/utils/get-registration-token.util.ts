import { PARTIAL_CONFIGURATION_KEY } from '../config.constants';

/**
 * @publicApi
 */
export function getRegistrationToken(config: Record<string, any>) {
  return config[PARTIAL_CONFIGURATION_KEY];
}
