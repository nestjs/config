import { getRegistrationToken } from './get-registration-token.util';

export function mergeConfigObjects(
  configHost: Record<string, any>,
  obj: Record<string, any>,
) {
  const token = getRegistrationToken(obj);
  if (token) {
    return (configHost[token] = obj);
  }
  Object.assign(configHost, obj);
}
