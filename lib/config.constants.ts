/**
 * Injection tokens
 */
export const CONFIGURATION_SERVICE_TOKEN = Symbol('CONFIG_SERVICE');
export const CONFIGURATION_TOKEN = 'CONFIGURATION_TOKEN';
export const CONFIGURATION_LOADER = 'CONFIGURATION_LOADER';
export const VALIDATED_ENV_LOADER = 'VALIDATED_ENV_LOADER';
export const CONFIGURATION_LOADED = Symbol('CONFIGURATION_LOADED');
export const LOAD_FACTORY_ENV = Symbol('LOAD_FACTORY_ENV');

export const PARTIAL_CONFIGURATION_KEY = 'PARTIAL_CONFIGURATION_KEY';
export const PARTIAL_CONFIGURATION_PROPNAME = 'KEY';
// A symbol, so that no property path passed to "ConfigService#get" reaches it
export const VALIDATED_ENV_PROPNAME = Symbol('PROCESS_ENV_VALIDATED');
export const AS_PROVIDER_METHOD_KEY = 'asProvider';
