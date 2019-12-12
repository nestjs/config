import { PARTIAL_CONFIGURATION_KEY } from '../config.constants';

export function getRegistrationToken(config: Record<string, any>) {
  return config[PARTIAL_CONFIGURATION_KEY];
}
