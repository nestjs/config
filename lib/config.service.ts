import { Inject, Injectable, Optional } from '@nestjs/common';
import get from 'lodash.get';
import { isUndefined } from 'util';
import { CONFIGURATION_TOKEN } from './config.constants';
import { ConfigKey } from './interfaces';

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
  get<T = any>(propertyPath: string, defaultValue?: T): T | undefined {
    const processValue = get(process.env, propertyPath);
    if (!isUndefined(processValue)) {
      return (processValue as unknown) as T;
    }
    const internalValue = get(this.internalConfig, propertyPath);
    return isUndefined(internalValue) ? defaultValue : internalValue;
  }

  /**
   * Get a configuration value (either custom configuration or process environment variable)
   * based on config key which contains predefined property path and default value.
   * @param key
   */
  getByKey<T = any>(key: ConfigKey<T>): T | undefined {
    return this.get(key.propertyPath, key.defaultValue);
  }
}
