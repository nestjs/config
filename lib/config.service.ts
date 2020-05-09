import { Inject, Injectable, Optional } from '@nestjs/common';
import get from 'lodash.get';
import { isUndefined } from 'util';
import {
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_PROPNAME,
} from './config.constants';
import { NoInferType } from './types';

@Injectable()
export class ConfigService {
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
  get<T = any>(propertyPath: string): T | undefined;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: string, defaultValue: NoInferType<T>): T;
  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on property path (you can use dot notation to traverse nested object, e.g. "database.host").
   * It returns a default value if the key does not exist.
   * @param propertyPath
   * @param defaultValue
   */
  get<T = any>(propertyPath: string, defaultValue?: T): T | undefined {
    const validatedEnvValue = get(
      this.internalConfig[VALIDATED_ENV_PROPNAME],
      propertyPath,
    );
    if (!isUndefined(validatedEnvValue)) {
      return (validatedEnvValue as unknown) as T;
    }
    const processValue = get(process.env, propertyPath);
    if (!isUndefined(processValue)) {
      return (processValue as unknown) as T;
    }
    const internalValue = get(this.internalConfig, propertyPath);
    return isUndefined(internalValue) ? defaultValue : internalValue;
  }
}
