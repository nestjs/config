/**
 * The published package is only as correct as its manifest: anything imported
 * from "lib" ships in the compiled output (and in the generated .d.ts files),
 * so it has to be declared as a runtime or peer dependency.
 */
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';

const libDir = fileURLToPath(new URL('../lib', import.meta.url));

const manifest = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

function getImportedPackages(): string[] {
  const files = fs
    .readdirSync(libDir, { recursive: true })
    .filter((file): file is string => String(file).endsWith('.ts'));

  const packages = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(`${libDir}/${file}`, 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+'([^']+)'/g)) {
      if (specifier.startsWith('.') || specifier.startsWith('node:')) {
        continue;
      }
      const segments = specifier.split('/');
      packages.add(
        specifier.startsWith('@')
          ? segments.slice(0, 2).join('/')
          : segments[0],
      );
    }
  }
  return [...packages].sort();
}

describe('Package manifest', () => {
  it('should declare every package imported from lib', () => {
    const declared = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ];
    const undeclared = getImportedPackages().filter(
      name => !declared.includes(name) && !isNodeBuiltin(name),
    );

    expect(undeclared).toEqual([]);
  });

  it('should resolve the entry point for every consumer condition', () => {
    const entry = manifest.exports['.'];

    // Without a "default" condition, require() of this package fails to
    // resolve instead of falling back to the ESM entry point.
    expect(entry.default ?? entry.require).toBeDefined();
    expect(entry.types).toBeDefined();
  });

  it('should expose package.json to tooling that reads it', () => {
    expect(manifest.exports['./package.json']).toEqual('./package.json');
  });
});

function isNodeBuiltin(name: string): boolean {
  return ['fs', 'path', 'url', 'crypto', 'util', 'os'].includes(name);
}
