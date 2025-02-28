/**
 * @publicApi
 */
export function getConfigToken(token: string | symbol): string {
  return `CONFIGURATION(${token.toString()})`;
}
