import set from 'lodash.set';

export function mergeConfigObject(
  host: Record<string, any>,
  partial: Record<string, any>,
  token?: string,
) {
  if (token) {
    set(host, token, partial);

    return partial;
  }
  Object.assign(host, partial);
}
