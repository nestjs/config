import set from 'lodash/set';

/**
 * @publicApi
 */
export function mergeConfigObject(
  host: Record<string, any>,
  partial: Record<string, any>,
  token?: string,
): Record<string, any> | undefined {
  if (token) {
    set(host, token, partial);
    return partial;
  }
  Object.assign(host, partial);
}
