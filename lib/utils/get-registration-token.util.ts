import { CONFIGURATION_NAMESPACE } from '../config.constants';

export function getRegistrationToken(config: Record<string, any>) {
  return config[CONFIGURATION_NAMESPACE];
}
