import { setProperty } from './property-path.util.js';

/**
 * @publicApi
 */
export function mergeConfigObject(
  host: Record<string, any>,
  partial: Record<string, any>,
  token?: string,
): Record<string, any> | undefined {
  if (token) {
    setProperty(host, token, partial);
    return partial;
  }
  Object.assign(host, partial);
}
