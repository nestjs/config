import { Inject, Injectable, Optional } from '@nestjs/common';
import get from 'lodash.get';
import has from 'lodash.has';
import set from 'lodash.set';
import { isUndefined } from 'util';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants';
import { NoInferType } from './types';

@Injectable()
export class ConfigService<K = Record<string, any>> {
  get isCacheEnabled(): boolean {
    return this._isCacheEnabled;
  }

  set isCacheEnabled(value: boolean) {
    this._isCacheEnabled = value;
  }

  private readonly cache: K = {} as any;
  private _isCacheEnabled = false;

  constructor(
    @Optional()
    @Inject(CONFIGURATION_TOKEN)
    private readonly internalConfig: Record<string, any> = {},
  ) {}

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: keyof K): T | undefined;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: keyof K, defaultValue: NoInferType<T>): T;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: keyof K, defaultValue?: T): T | undefined {
    if (
      this.isCacheEnabled &&
      has(this.cache as Record<any, any>, propertyPath)
    ) {
      const cachedValue = this.getFromCache(propertyPath, defaultValue);
      return !isUndefined(cachedValue) ? cachedValue : defaultValue;
    }

    const validatedEnvValue = this.getFromValidatedEnv(propertyPath);
    if (!isUndefined(validatedEnvValue)) {
      return validatedEnvValue;
    }

    const processEnvValue = this.getFromProcessEnv(propertyPath);
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

  private getFromValidatedEnv<T = any>(propertyPath: keyof K): T | undefined {
    const validatedEnvValue = get(
      this.internalConfig[VALIDATED_ENV_PROPNAME],
      propertyPath,
    );
    this.setInCache(propertyPath, validatedEnvValue);

    return (validatedEnvValue as unknown) as T;
  }

  private getFromProcessEnv<T = any>(propertyPath: keyof K): T | undefined {
    const processValue = get(process.env, propertyPath);
    this.setInCache(propertyPath, processValue);

    return (processValue as unknown) as T;
  }

  private getFromInternalConfig<T = any>(propertyPath: keyof K): T | undefined {
    const internalValue = get(this.internalConfig, propertyPath);
    this.setInCache(propertyPath, internalValue);

    return internalValue;
  }

  private setInCache(propertyPath: keyof K, value: any): void {
    set(this.cache as Record<any, any>, propertyPath, value);
  }
}
