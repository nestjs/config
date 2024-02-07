/**
 * Represents a change in the configuration object.
 * Dispatched when one updates the configuration object through the `ConfigService#set` method.
 * @publicApi
 */
export interface ConfigChangeEvent<OldValue = any, NewValue = any> {
  path: string;
  oldValue: OldValue;
  newValue: NewValue;
}
