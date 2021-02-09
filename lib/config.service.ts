import { Inject, Injectable, Optional } from '@nestjs/common';
import get from 'lodash.get';
import has from 'lodash.has';
import set from 'lodash.set';
import { isUndefined } from 'util';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants';

type InternalConfig<K> = Partial<K & { [key in typeof VALIDATED_ENV_PROPNAME]: unknown }>;

@Injectable()
export class ConfigService<K = Record<string, unknown>> {
  get isCacheEnabled(): boolean {
    return this._isCacheEnabled;
  }

  set isCacheEnabled(value: boolean) {
    this._isCacheEnabled = value;
  }

  private readonly cache: Partial<K> = {};
  private _isCacheEnabled = false;

  constructor(
    @Optional()
    @Inject(CONFIGURATION_TOKEN)
    private readonly internalConfig: InternalConfig<K> = {},
  ) {}

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns undefined if the key does not exist.
   * @param propertyPath
   */
  get<T extends keyof K>(propertyPath: T): K[T];
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T extends keyof K, U>(propertyPath: T, defaultValue: U): K[T] | U;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T extends keyof K, U>(propertyPath: T, defaultValue?: U): K[T] | U | undefined {
    const validatedEnvValue = this.getFromValidatedEnv(propertyPath);
    if (!isUndefined(validatedEnvValue)) {
      return validatedEnvValue;
    }

    const processEnvValue = this.getFromProcessEnv(propertyPath, defaultValue);
    if (!isUndefined(processEnvValue)) {
      return processEnvValue;
    }

    const internalValue = this.getFromInternalConfig(propertyPath);
    if (!isUndefined(internalValue)) {
      return internalValue;
    }

    return defaultValue;
  }

  private getFromCache<T = any>(
    propertyPath: keyof K,
    defaultValue?: T,
  ): T | undefined {
    const cachedValue = get(this.cache, propertyPath);
    return isUndefined(cachedValue)
      ? defaultValue
      : ((cachedValue as unknown) as T);
  }

  private getFromValidatedEnv<T extends keyof K>(propertyPath: T): K[T] | undefined {
    const validatedEnvValue = get(
      this.internalConfig[VALIDATED_ENV_PROPNAME],
      propertyPath,
    );
    return validatedEnvValue as K[T];
  }

  private getFromProcessEnv<T extends keyof K, U>(
    propertyPath: T,
    defaultValue: U,
  ): K[T] | U {
    if (
      this.isCacheEnabled &&
      has(this.cache, propertyPath)
    ) {
      const cachedValue = this.getFromCache(propertyPath, defaultValue);
      return !isUndefined(cachedValue) ? cachedValue : defaultValue;
    }
    const processValue = get(process.env, propertyPath);
    this.setInCacheIfDefined(propertyPath, processValue);

    return processValue;
  }

  private getFromInternalConfig<T extends keyof K>(propertyPath: T): K[T] | undefined {
    const internalValue = get(this.internalConfig, propertyPath);
    return internalValue;
  }

  private setInCacheIfDefined(propertyPath: keyof K, value: unknown): void {
    if (typeof value === 'undefined') {
      return;
    }
    set(this.cache, propertyPath, value);
  }
}
