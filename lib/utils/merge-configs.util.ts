export function mergeConfigObject(
  host: Record<string, any>,
  partial: Record<string, any>,
  token?: string,
) {
  if (token) {
    return (host[token] = partial);
  }
  Object.assign(host, partial);
}
