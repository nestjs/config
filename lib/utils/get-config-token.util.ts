import { CONFIGURATION_TOKEN } from '../config.constants';

export function getConfigToken(token: string) {
  return `${CONFIGURATION_TOKEN}_${token}`;
}
