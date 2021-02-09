import { Inject, Injectable, Optional } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import get from 'lodash.get';
import has from 'lodash.has';
import set from 'lodash.set';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME
} from './config.constants';
import { NoInferType } from './types';

export type PathImpl<T, Key extends keyof T> =
  Key extends string
  ? T[Key] extends Record<string, any>
    ? | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}`
      | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
    : never
  : never;

export type PathImpl2<T> = PathImpl<T, keyof T> | keyof T;
export type Path<T> = PathImpl2<T> extends string | keyof T ? PathImpl2<T> : keyof T;

export type PathValue<T, P extends Path<T>> =
  P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

@Injectable()
export class ConfigService<K = Record<string, any>> {
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
  get<T = K, P extends Path<T> = any, R = PathValue<T, P>>(propertyPath: P, options: { inferDotNotation: true }): R | undefined;
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
   * @param defaultValueOrOptions
   */
  get<T = any>(propertyPath: keyof K, defaultValueOrOptions?: T | { inferDotNotation: true }): T | undefined {
    const validatedEnvValue = this.getFromValidatedEnv(propertyPath);
    if (!isUndefined(validatedEnvValue)) {
      return validatedEnvValue;
    }
    defaultValueOrOptions = (defaultValueOrOptions as { inferDotNotation: true })?.inferDotNotation 
      ? undefined 
      : defaultValueOrOptions;

    const processEnvValue = this.getFromProcessEnv(propertyPath, defaultValueOrOptions);
    if (!isUndefined(processEnvValue)) {
      return processEnvValue;
    }

    const internalValue = this.getFromInternalConfig(propertyPath);
    if (!isUndefined(internalValue)) {
      return internalValue;
    }

    return defaultValueOrOptions as T;
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
    return (validatedEnvValue as unknown) as T;
  }

  private getFromProcessEnv<T = any>(
    propertyPath: keyof K,
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

    return (processValue as unknown) as T;
  }

  private getFromInternalConfig<T = any>(propertyPath: keyof K): T | undefined {
    const internalValue = get(this.internalConfig, propertyPath);
    return internalValue;
  }

  private setInCacheIfDefined(propertyPath: keyof K, value: any): void {
    if (typeof value === 'undefined') {
      return;
    }
    set(this.cache as Record<any, any>, propertyPath, value);
  }
}
