import { getRootKey, hasOwn, resolveProperty } from './property-path.util.js';

interface ValidatedEnvLayer {
  values: Record<string, any>;
  // Variables "ConfigService#get" doesn't serve from this layer (e.g. ones
  // that take precedence from process.env)
  hiddenKeys: Set<string>;
  // Variables the validator converted (or added), as opposed to the ones it
  // passed through as they were
  convertedKeys: Set<string>;
}

const NOT_FOUND = { found: false, value: undefined };

/**
 * Validated environment variables served by `ConfigService#get`, one layer
 * per `ConfigModule.forRoot()` call. A layer holds the validator's output as
 * is, so that the members of a class instance it returns keep working.
 */
export class ValidatedEnv {
  private readonly layers: ValidatedEnvLayer[] = [];

  add(
    values: Record<string, any>,
    hiddenKeys: Set<string>,
    convertedKeys: Set<string>,
  ): void {
    this.layers.push({ values, hiddenKeys, convertedKeys });
  }

  /**
   * Resolves a property path. "found" with an `undefined` value means that
   * the validator removed the variable.
   */
  resolve(path: PropertyKey): { found: boolean; value: unknown } {
    for (const layer of this.getLayers(path)) {
      const result = resolveProperty(layer.values, path);
      if (result.found) {
        return result;
      }
    }
    return NOT_FOUND;
  }

  /**
   * Replaces the value of a variable that is a string (a value converted by
   * validation, e.g. to a number, is not replaced, it isn't validated again).
   * The variable name is used as is, never as a path.
   */
  update(key: string, value: string): void {
    const layer = this.getLayers(key).find(({ values }) => hasOwn(values, key));
    if (
      layer &&
      !Object.isFrozen(layer.values) &&
      typeof layer.values[key] === 'string'
    ) {
      layer.values[key] = value;
    }
  }

  /**
   * Returns the layers that may serve a path, in the order they are tried:
   * the ones that converted it (the last first), then all of them in the
   * order they were added. So a value a validator only passed through (e.g.
   * the raw form of a variable another validator converted) doesn't replace a
   * converted one.
   */
  private getLayers(path: PropertyKey): ValidatedEnvLayer[] {
    const visibleLayers = this.layers.filter(
      ({ values, hiddenKeys }) =>
        !hiddenKeys.has(getRootKey(values, path) as string),
    );
    const convertingLayers = visibleLayers.filter(({ values, convertedKeys }) =>
      convertedKeys.has(getRootKey(values, path) as string),
    );
    return [...convertingLayers.reverse(), ...visibleLayers];
  }
}
