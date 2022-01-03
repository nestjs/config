import { Inject, Injectable, Optional } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { get, has, set } from 'lodash';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants';
import { NoInferType, Path, PathValue } from './types';

/**
 * `ExcludeUndefinedIf<ExcludeUndefined, T>
 *
 * If `ExcludeUndefined` is `true`, remove `undefined` from `T`.
 * Otherwise, constructs the type `T` with `undefined`.
 */
type ExcludeUndefinedIf<
  ExcludeUndefined extends boolean,
  T,
> = ExcludeUndefined extends true ? Exclude<T, undefined> : T | undefined;

export interface ConfigGetOptions {
  /**
   * If present, "get" method will try to automatically
   * infer a type of property based on the type argument
   * specified at the "ConfigService" class-level (example: ConfigService<Configuration>).
   */
  infer: true;
}

type KeyOf<T> = keyof T extends never ? string : keyof T;

@Injectable()
export class ConfigService<
  K = Record<string, unknown>,
  WasValidated extends boolean = false,
> {
  private set isCacheEnabled(value: boolean) {
    this._isCacheEnabled = value;
  }

  private get isCacheEnabled(): boolean {
    return this._isCacheEnabled;
  }

  private readonly cache: Partial<K> = {} as any;
  private _isCacheEnabled = false;

  constructor(
    @Optional()
    @Inject(CONFIGURATION_TOKEN)
    private readonly internalConfig: Record<string, any> = {},
  ) {}

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   */
  get<T = any>(propertyPath: KeyOf<K>): ExcludeUndefinedIf<WasValidated, T>;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * @param propertyPath
   * @param options
   */
  get<T = K, P extends Path<T> = any, R = PathValue<T, P>>(
    propertyPath: P,
    options: ConfigGetOptions,
  ): ExcludeUndefinedIf<WasValidated, R>;
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
  get<T = K, P extends Path<T> = any, R = PathValue<T, P>>(
    propertyPath: P,
    defaultValue: NoInferType<R>,
    options: ConfigGetOptions,
  ): R;
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
    const validatedEnvValue = this.getFromValidatedEnv(propertyPath);
    if (!isUndefined(validatedEnvValue)) {
      return validatedEnvValue;
    }
    const defaultValue =
      this.isGetOptionsObject(defaultValueOrOptions) && !options
        ? undefined
        : defaultValueOrOptions;

    const processEnvValue = this.getFromProcessEnv(propertyPath, defaultValue);
    if (!isUndefined(processEnvValue)) {
      return processEnvValue;
    }

    const internalValue = this.getFromInternalConfig(propertyPath);
    if (!isUndefined(internalValue)) {
      return internalValue;
    }

    return defaultValue as T;
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
}
