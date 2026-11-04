import * as fs from 'fs';
import { Parser } from '../types/index.js';
import { hasOwn } from './property-path.util.js';

/**
 * Reads and parses env files. A variable defined in more than one file gets
 * its value from the first file that defines it. The variables of the first
 * file come first, so that chains of references are expanded in file order.
 */
export function readEnvFiles(
  envFilePaths: string[],
  parser: Parser,
): Record<string, any> {
  const config: Record<string, any> = {};
  for (const envFilePath of envFilePaths) {
    if (!fs.existsSync(envFilePath)) {
      continue;
    }
    const parsed = parser(fs.readFileSync(envFilePath));
    for (const [key, value] of Object.entries(parsed)) {
      // "__proto__" (e.g. returned by a JSON parser) would replace the
      // prototype of the merged object instead of defining a variable
      if (key === '__proto__' || hasOwn(config, key)) {
        continue;
      }
      // process.env cuts a value off at a NUL character, so what is
      // validated would not be what the application gets
      if (typeof value === 'string' && value.includes('\0')) {
        throw new Error(
          `Environment variable "${key}" in "${envFilePath}" contains a NUL character`,
        );
      }
      config[key] = value;
    }
  }
  return config;
}
