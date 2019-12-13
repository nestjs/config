export interface ConfigKey<T> {
  /**
   * Predefined property path
   */
  propertyPath: string;

  /**
   * Predefined default value
   */
  defaultValue?: T;
}
