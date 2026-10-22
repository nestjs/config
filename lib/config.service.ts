import { Inject, Injectable, Optional } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils.js';
import get from 'es-toolkit/compat/get';
import has from 'es-toolkit/compat/has';
import set from 'es-toolkit/compat/set';
import fs from 'fs';
import { Subject } from 'rxjs';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants.js';
import { ConfigChangeEvent } from './interfaces/config-change-event.interface.js';
import { NoInferType, Parser, Path, PathValue } from './types/index.js';
import { getDefaultParser } from './utils/index.js';

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

  private readonly cache: Partial<K> = {} as any;
  private readonly _changes$ = new Subject<ConfigChangeEvent>();
  private _skipProcessEnv = false;
  private _isCacheEnabled = false;
  private envFilePaths: string[] = [];
  private predefinedEnv = new Map<string, string | undefined>();
  private parser: Parser = getDefaultParser();

  constructor(
    @Optional()
    @Inject(CONFIGURATION_TOKEN)
    private readonly internalConfig: Record<string, any> = {},
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

    const validatedEnvValue = this.getFromValidatedEnv(propertyPath);
    if (!isUndefined(validatedEnvValue)) {
      return validatedEnvValue;
    }
    const defaultValue =
      this.isGetOptionsObject(defaultValueOrOptions as Record<string, any>) &&
      !options
        ? undefined
        : defaultValueOrOptions;

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
      | T
      | undefined;

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
    set(this.internalConfig, propertyPath, value);

    if (typeof propertyPath === 'string') {
      process.env[propertyPath] = String(value);
      this.updateInterpolatedEnv(propertyPath);
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
   * @param paths
   */
  setEnvFilePaths(paths: string[]): void {
    this.envFilePaths = paths;
  }

  /**
   * Sets parser from `config.module.ts`.
   * @param parser
   */
  setParser(parser: Parser): void {
    this.parser = parser;
  }

  private getFromCache<T = any>(
    propertyPath: KeyOf<K>,
    defaultValue?: T,
  ): T | undefined {
    const cachedValue = get(this.cache, propertyPath);
    return isUndefined(cachedValue)
      ? defaultValue
      : (cachedValue as unknown as T);
  }

  private getFromValidatedEnv<T = any>(propertyPath: KeyOf<K>): T | undefined {
    const validatedEnvValue = get(
      this.internalConfig[VALIDATED_ENV_PROPNAME],
      propertyPath,
    );
    return validatedEnvValue as unknown as T;
  }

  private getFromProcessEnv<T = any>(
    propertyPath: KeyOf<K>,
    defaultValue: any,
  ): T | undefined {
    if (
      this.isCacheEnabled &&
      has(this.cache as Record<any, any>, propertyPath)
    ) {
      const cachedValue = this.getFromCache(propertyPath, defaultValue);
      return !isUndefined(cachedValue) ? cachedValue : defaultValue;
    }
    const processValue = get(process.env, propertyPath);
    this.setInCacheIfDefined(propertyPath, processValue);

    return processValue as unknown as T;
  }

  private getFromInternalConfig<T = any>(
    propertyPath: KeyOf<K>,
  ): T | undefined {
    const internalValue = get(this.internalConfig, propertyPath);
    return internalValue;
  }

  private setInCacheIfDefined(propertyPath: KeyOf<K>, value: any): void {
    if (typeof value === 'undefined') {
      return;
    }
    set(this.cache as Record<any, any>, propertyPath, value);
  }

  private isGetOptionsObject(
    options: Record<string, any> | undefined,
  ): options is ConfigGetOptions {
    return options && options?.infer && Object.keys(options).length === 1;
  }

  private updateInterpolatedEnv(propertyPath: string): void {
    let config: Record<string, any> = {};
    for (const envFilePath of this.envFilePaths) {
      if (fs.existsSync(envFilePath)) {
        config = Object.assign(
          this.parser(fs.readFileSync(envFilePath)),
          config,
        );
      }
    }

    // Same syntax as in dotenv-expand: $KEY, ${KEY}, ${KEY:-default},
    // ${KEY:+alternative} (also without ":") and \$ for literal $
    const referenceRegex =
      /\\\$|\$\{([^{}:+-]+)(?:(:?[-+])([^{}]*))?\}|\$([A-Za-z_]\w*)/g;
    const changedKeys = new Set([propertyPath]);
    const validatedEnv = this.internalConfig[VALIDATED_ENV_PROPNAME];
    for (const [k, v] of Object.entries(config)) {
      // Value that was in process.env before env file was loaded wins, same
      // as in dotenv-expand on startup
      const predefined = this.predefinedEnv.get(k);
      if (
        typeof v !== 'string' ||
        k === propertyPath ||
        (predefined && predefined !== v)
      ) {
        continue;
      }
      const references = [...v.matchAll(referenceRegex)].map(
        ([, key, , , plainKey]) => key ?? plainKey,
      );
      if (!references.some(ref => changedKeys.has(ref))) {
        continue;
      }
      // All references get current values, which are inserted as is (unlike
      // dotenv-expand, "$" inside of them is not expanded again)
      const updated = v.replace(
        referenceRegex,
        (match, key, operator = '', alternative = '', plainKey) => {
          if (match === '\\$') {
            return '$';
          }
          const name = key ?? plainKey;
          const current = name === k ? undefined : process.env[name];
          if (operator.endsWith('+')) {
            return current ? alternative : '';
          }
          return current || alternative;
        },
      );
      if (updated === process.env[k]) {
        continue;
      }
      changedKeys.add(k);
      process.env[k] = updated;
      if (this.isCacheEnabled) {
        this.setInCacheIfDefined(k as KeyOf<K>, updated);
      }
      if (
        validatedEnv &&
        !Object.isFrozen(validatedEnv) &&
        has(validatedEnv, k)
      ) {
        set(validatedEnv, k, updated);
      }
    }
  }
}
