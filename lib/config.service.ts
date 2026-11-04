import { Inject, Injectable, Optional } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils.js';
import { Subject } from 'rxjs';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants.js';
import { ConfigChangeEvent } from './interfaces/config-change-event.interface.js';
import { NoInferType, Parser, Path, PathValue } from './types/index.js';
import { getDefaultParser } from './utils/index.js';
import { getProperty, setProperty } from './utils/property-path.util.js';
import { readEnvFiles } from './utils/read-env-files.util.js';
import { ValidatedEnv } from './utils/validated-env.util.js';

// Same syntax as in dotenv-expand: $KEY, ${KEY}, ${KEY:-default},
// ${KEY:+alternative} (also without ":") and \$ for literal $. Nested defaults
// (${A:-${B}}) are not supported
const ENV_REFERENCE_REGEX =
  /\\\$|\$\{([^{}:+-]+)(?:(:?[-+])([^{}]*))?\}|\$([A-Za-z_]\w*)/g;

// Longest value a variable may get when "set" expands it again. Without a
// limit, a chain of variables that each reference the previous one twice
// doubles in size at every step. A "NAME=value" string of this size can no
// longer be passed to a child process on Linux (MAX_ARG_STRLEN)
const MAX_EXPANDED_LENGTH = 128 * 1024;

/**
 * `ValidatedResult<WasValidated, T>
 *
 * If `WasValidated` is `true`, return `T`.
 * Otherwise, constructs the type `T` with `undefined`.
 */
type ValidatedResult<
  WasValidated extends boolean,
  T,
> = WasValidated extends true ? T : T | undefined;

/**
 * @publicApi
 */
export interface ConfigGetOptions {
  /**
   * If present, "get" method will try to automatically
   * infer a type of property based on the type argument
   * specified at the "ConfigService" class-level (example: ConfigService<Configuration>).
   */
  infer: true;
}

type KeyOf<T> = keyof T extends never ? string | symbol : keyof T;

/**
 * @publicApi
 */
@Injectable()
export class ConfigService<
  K = Record<string | symbol, unknown>,
  WasValidated extends boolean = false,
> {
  private set isCacheEnabled(value: boolean) {
    this._isCacheEnabled = value;
  }

  private get isCacheEnabled(): boolean {
    return this._isCacheEnabled;
  }

  private set skipProcessEnv(value: boolean) {
    this._skipProcessEnv = value;
  }

  private get skipProcessEnv(): boolean {
    return this._skipProcessEnv;
  }

  // Keyed by the property path as it was passed to "get"
  private readonly cache = new Map<KeyOf<K>, unknown>();
  private readonly _changes$ = new Subject<ConfigChangeEvent>();
  private _skipProcessEnv = false;
  private _isCacheEnabled = false;
  private envFilePaths: string[] = [];
  private envFileConfig: Record<string, unknown> = {};
  private expansionEnv?: Record<string, string | undefined>;
  private predefinedEnv = new Map<string, string | undefined>();
  private loadedEnv?: Map<string, string | undefined>;
  // Keys passed to "set", which keep their value when a variable they
  // reference changes
  private readonly explicitlySetKeys = new Set<string>();
  private parser: Parser = getDefaultParser();

  constructor(
    @Optional()
    @Inject(CONFIGURATION_TOKEN)
    private readonly internalConfig: Record<string | symbol, any> = {},
  ) {}

  /**
   * Returns a stream of configuration changes.
   * Each event contains the attribute path, the old value and the new value.
   */
  get changes$() {
    return this._changes$.asObservable();
  }

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   */
  get<T = any>(propertyPath: KeyOf<K>): ValidatedResult<WasValidated, T>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   * @param options
   */
  get<
    T = K,
    P extends Path<T> = any,
    R extends PathValue<T, P> = PathValue<T, P>,
  >(
    propertyPath: P,
    options: ConfigGetOptions,
  ): ValidatedResult<WasValidated, R>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: KeyOf<K>, defaultValue: NoInferType<T>): T;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   * @param options
   */
  get<
    T = K,
    P extends Path<T> = any,
    R extends PathValue<T, P> = PathValue<T, P>,
  >(
    propertyPath: P,
    defaultValue: NoInferType<R>,
    options: ConfigGetOptions,
  ): Exclude<R, undefined>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValueOrOptions
   */
  get<T = any>(
    propertyPath: KeyOf<K>,
    defaultValueOrOptions?: T | ConfigGetOptions,
    options?: ConfigGetOptions,
  ): T | undefined {
    const internalValue = this.getFromInternalConfig(propertyPath);
    if (!isUndefined(internalValue)) {
      return internalValue;
    }

    const defaultValue =
      this.isGetOptionsObject(defaultValueOrOptions as Record<string, any>) &&
      !options
        ? undefined
        : defaultValueOrOptions;

    const validatedEnvValue = this.validatedEnv?.resolve(propertyPath);
    if (validatedEnvValue?.found) {
      // Variable that validation mapped to "undefined" is not looked up in
      // process.env, which may still hold its raw value
      return isUndefined(validatedEnvValue.value)
        ? (defaultValue as T)
        : (validatedEnvValue.value as T);
    }

    if (!this._skipProcessEnv) {
      const processEnvValue = this.getFromProcessEnv(
        propertyPath,
        defaultValue,
      );
      if (!isUndefined(processEnvValue)) {
        return processEnvValue;
      }
    }

    return defaultValue as T;
  }

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   */
  getOrThrow<T = any>(propertyPath: KeyOf<K>): Exclude<T, undefined>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   * @param options
   */
  getOrThrow<
    T = K,
    P extends Path<T> = any,
    R extends PathValue<T, P> = PathValue<T, P>,
  >(propertyPath: P, options: ConfigGetOptions): Exclude<R, undefined>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * If the default value is undefined an exception will be thrown.
   * @param propertyPath
   * @param defaultValue
   */
  getOrThrow<T = any>(
    propertyPath: KeyOf<K>,
    defaultValue: NoInferType<T>,
  ): Exclude<T, undefined>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * If the default value is undefined an exception will be thrown.
   * @param propertyPath
   * @param defaultValue
   * @param options
   */
  getOrThrow<
    T = K,
    P extends Path<T> = any,
    R extends PathValue<T, P> = PathValue<T, P>,
  >(
    propertyPath: P,
    defaultValue: NoInferType<R>,
    options: ConfigGetOptions,
  ): Exclude<R, undefined>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * If the default value is undefined an exception will be thrown.
   * @param propertyPath
   * @param defaultValueOrOptions
   */
  getOrThrow<T = any>(
    propertyPath: KeyOf<K>,
    defaultValueOrOptions?: T | ConfigGetOptions,
    options?: ConfigGetOptions,
  ): Exclude<T, undefined> {
    // @ts-expect-error Bypass method overloads
    const value = this.get(propertyPath, defaultValueOrOptions, options) as
      T | undefined;

    if (isUndefined(value)) {
      throw new TypeError(
        `Configuration key "${propertyPath.toString()}" does not exist`,
      );
    }

    return value as Exclude<T, undefined>;
  }
  /**
   * Sets a configuration value based on property path.
   * @param propertyPath
   * @param value
   */
  set<T = any>(propertyPath: KeyOf<K>, value: T): void {
    const oldValue = this.get(propertyPath);
    // Computed first, as it throws if a variable would grow too long
    const interpolatedEnv =
      typeof propertyPath === 'string'
        ? this.getInterpolatedEnv(propertyPath, String(value))
        : new Map<string, string>();
    setProperty(this.internalConfig, propertyPath, value);

    if (typeof propertyPath === 'string') {
      this.explicitlySetKeys.add(propertyPath);
      this.setEnv(propertyPath, String(value));
      // Not predefined for a later "forRoot" (e.g. app bootstrapped again)
      this.loadedEnv?.set(propertyPath, String(value));
      interpolatedEnv.forEach((updated, key) =>
        this.setInterpolatedEnv(key, updated),
      );
    }

    if (this.isCacheEnabled) {
      this.setInCacheIfDefined(propertyPath, value);
    }

    this._changes$.next({
      path: propertyPath as string,
      oldValue,
      newValue: value,
    });
  }
  /**
   * Sets env file paths from `config.module.ts` to parse.
   * The files are read once, when this method is called.
   * @param paths
   * @deprecated `ConfigModule.forRoot()` passes the variables it loaded instead.
   */
  setEnvFilePaths(paths: string[]): void {
    this.envFilePaths = paths;
    this.envFileConfig = readEnvFiles(paths, this.parser);
  }

  /**
   * Sets parser from `config.module.ts`.
   * @param parser
   * @deprecated `ConfigModule.forRoot()` passes the variables it loaded instead.
   */
  setParser(parser: Parser): void {
    this.parser = parser;
    this.envFileConfig = readEnvFiles(this.envFilePaths, parser);
  }

  private setEnvFileConfig(envFileConfig: Record<string, unknown>): void {
    this.envFileConfig = envFileConfig;
  }

  private setExpansionEnv(
    expansionEnv: Record<string, string | undefined> | undefined,
  ): void {
    this.expansionEnv = expansionEnv;
  }

  private getFromCache<T = any>(
    propertyPath: KeyOf<K>,
    defaultValue?: T,
  ): T | undefined {
    const cachedValue = this.cache.get(propertyPath);
    return isUndefined(cachedValue)
      ? defaultValue
      : (cachedValue as unknown as T);
  }

  private get validatedEnv(): ValidatedEnv | undefined {
    return this.internalConfig[VALIDATED_ENV_PROPNAME];
  }

  private getFromProcessEnv<T = any>(
    propertyPath: KeyOf<K>,
    defaultValue: any,
  ): T | undefined {
    if (this.isCacheEnabled && this.cache.has(propertyPath)) {
      const cachedValue = this.getFromCache(propertyPath, defaultValue);
      return !isUndefined(cachedValue) ? cachedValue : defaultValue;
    }
    const processValue = getProperty(process.env, propertyPath);
    if (this.isCacheEnabled) {
      this.setInCacheIfDefined(propertyPath, processValue);
    }

    return processValue as unknown as T;
  }

  private getFromInternalConfig<T = any>(
    propertyPath: KeyOf<K>,
  ): T | undefined {
    const internalValue = getProperty(this.internalConfig, propertyPath);
    return internalValue as T | undefined;
  }

  private setInCacheIfDefined(propertyPath: KeyOf<K>, value: any): void {
    if (typeof value === 'undefined') {
      return;
    }
    this.cache.set(propertyPath, value);
  }

  private isGetOptionsObject(
    options: Record<string, any> | undefined,
  ): options is ConfigGetOptions {
    return options && options?.infer && Object.keys(options).length === 1;
  }

  private setPredefinedEnv(
    predefinedEnv: Map<string, string | undefined>,
    loadedEnv?: Map<string, string | undefined>,
  ): void {
    this.predefinedEnv = predefinedEnv;
    this.loadedEnv = loadedEnv;
  }

  private setEnv(key: string, value: string): void {
    process.env[key] = value;
    if (this.expansionEnv) {
      this.expansionEnv[key] = value;
    }
  }

  private expandReferences(
    key: string,
    value: string,
    lookup: (name: string) => string | undefined,
  ): string {
    // Current values are inserted as is (unlike dotenv-expand, "$" inside of
    // them is not expanded again)
    return value.replace(
      ENV_REFERENCE_REGEX,
      (match, bracedKey, operator = '', alternative = '', plainKey) => {
        if (match === '\\$') {
          return '$';
        }
        const name = bracedKey ?? plainKey;
        const current = name === key ? undefined : lookup(name);
        if (operator.endsWith('+')) {
          return current ? alternative : '';
        }
        return current || alternative;
      },
    );
  }

  /**
   * Returns the env file variables whose expanded value changes when
   * "propertyPath" is set to "value", with their new value
   */
  private getInterpolatedEnv(
    propertyPath: string,
    value: string,
  ): Map<string, string> {
    const env = this.expansionEnv ?? process.env;
    const updates = new Map([[propertyPath, value]]);
    const lookup = (name: string) =>
      updates.has(name) ? updates.get(name) : env[name];
    for (const [k, v] of Object.entries(this.envFileConfig)) {
      // Value that was in process.env before env file was loaded wins, same
      // as in dotenv-expand on startup. So does a value passed to "set" (by
      // this or an earlier call), which is what "get" returns
      const predefined = this.predefinedEnv.get(k);
      if (
        typeof v !== 'string' ||
        k === propertyPath ||
        this.explicitlySetKeys.has(k) ||
        (predefined && predefined !== v)
      ) {
        continue;
      }
      const references = [...v.matchAll(ENV_REFERENCE_REGEX)].map(
        ([, key, , , plainKey]) => key ?? plainKey,
      );
      if (!references.some(ref => updates.has(ref))) {
        continue;
      }
      const updated = this.expandReferences(k, v, lookup);
      if (updated === process.env[k]) {
        continue;
      }
      if (updated.length > MAX_EXPANDED_LENGTH) {
        throw new Error(
          `Environment variable "${k}" is too long after variable expansion`,
        );
      }
      updates.set(k, updated);
    }
    updates.delete(propertyPath);
    return updates;
  }

  private setInterpolatedEnv(key: string, value: string): void {
    this.setEnv(key, value);
    // Not predefined for a later "forRoot" (e.g. app bootstrapped again)
    this.loadedEnv?.set(key, value);
    if (this.isCacheEnabled) {
      this.setInCacheIfDefined(key as KeyOf<K>, value);
    }
    this.validatedEnv?.update(key, value);
  }
}
