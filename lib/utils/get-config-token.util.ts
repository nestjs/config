import { CONFIGURATION_TOKEN } from '../config.constants';

export function getConfigToken(token: string = '') {
  if (!token || token.length < 1) {
    return CONFIGURATION_TOKEN;
  }
  return `${CONFIGURATION_TOKEN}_${token}`;
}
