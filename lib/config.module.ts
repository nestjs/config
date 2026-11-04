import { DynamicModule, Module } from '@nestjs/common';
import { FactoryProvider } from '@nestjs/common/interfaces/index.js';
import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { DotenvExpandOptions, expand } from 'dotenv-expand';
import { resolve } from 'path';
import {
  ConfigLoadedModule,
  ConfigLoadedSignal,
} from './config-loaded.module.js';
import { ConfigHostModule } from './config-host.module.js';
import {
  CONFIGURATION_LOADED,
  CONFIGURATION_LOADER,
  CONFIGURATION_SERVICE_TOKEN,
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_LOADER,
  VALIDATED_ENV_PROPNAME,
} from './config.constants.js';
import { ConfigService } from './config.service.js';
import { ConfigFactory, ConfigModuleOptions } from './interfaces/index.js';
import { ConfigFactoryKeyHost, getDefaultParser } from './utils/index.js';
import { createConfigProvider } from './utils/create-config-factory.util.js';
import { getRegistrationToken } from './utils/get-registration-token.util.js';
import { mergeConfigObject } from './utils/merge-configs.util.js';
import { hasOwn } from './utils/property-path.util.js';
import { readEnvFiles } from './utils/read-env-files.util.js';
import {
  getDeclaredKeys,
  validateWithStandardSchema,
} from './utils/validate-with-schema.util.js';

/**
 * @publicApi
 */
@Module({
  imports: [ConfigHostModule],
  providers: [
    {
      provide: ConfigService,
      // Waits until "forRoot" has loaded the configuration (e.g. from async
      // "load" factories), so that it isn't read before it's complete
      useFactory: async (
        configService: ConfigService,
        configLoaded?: ConfigLoadedSignal,
      ) => {
        await configLoaded?.promise;
        return configService;
      },
      inject: [
        CONFIGURATION_SERVICE_TOKEN,
        { token: CONFIGURATION_LOADED, optional: true },
      ],
    },
  ],
  exports: [ConfigHostModule, ConfigService],
})
export class ConfigModule {
  /**
   * This promise resolves when parser completes loading environment variables.
   * When "ignoreEnvFile" is set to true, then it will resolve immediately after the
   * "ConfigModule#forRoot" method is called.
   * If "forRoot" is called more than once, it resolves once every call that is
   * in progress has completed.
   */
  public static get envVariablesLoaded(): Promise<void> {
    return this._envVariablesLoaded.then(() => this.waitForPendingForRoot());
  }

  private static environmentVariablesLoadedSignal: () => void;
  private static readonly _envVariablesLoaded = new Promise<void>(
    resolve => (ConfigModule.environmentVariablesLoadedSignal = resolve),
  );
  private static readonly pendingForRootCalls = new Set<Promise<unknown>>();
  // Variables that "forRoot" (or "ConfigService#set") wrote to process.env,
  // with the value they were given
  private static readonly loadedEnv = new Map<string, string | undefined>();

  /**
   * Loads environment variables based on the "ignoreEnvFile" flag and "envFilePath" value.
   * Additionally, registers custom configurations globally.
   * @param options
   */
  static async forRoot(
    options: ConfigModuleOptions = {},
  ): Promise<DynamicModule> {
    const loading = this.loadForRoot(options);
    this.pendingForRootCalls.add(loading);
    try {
      return await loading;
    } finally {
      this.pendingForRootCalls.delete(loading);
    }
  }

  /**
   * Registers configuration object (partial registration).
   * @param config
   */
  static forFeature(config: ConfigFactory): DynamicModule {
    const configProvider = createConfigProvider(
      config as ConfigFactory & ConfigFactoryKeyHost,
    );
    const serviceProvider = {
      provide: ConfigService,
      useFactory: async (
        configService: ConfigService,
        _loader: unknown,
        configLoaded?: ConfigLoadedSignal,
      ) => {
        await configLoaded?.promise;
        return configService;
      },
      inject: [
        CONFIGURATION_SERVICE_TOKEN,
        CONFIGURATION_LOADER,
        { token: CONFIGURATION_LOADED, optional: true },
      ],
    };

    return {
      module: ConfigModule,
      providers: [
        configProvider,
        serviceProvider,
        {
          provide: CONFIGURATION_LOADER,
          useFactory: (
            host: Record<string, any>,
            partialConfig: Record<string, any>,
          ) => {
            this.mergePartial(host, partialConfig, configProvider);
          },
          inject: [CONFIGURATION_TOKEN, configProvider.provide],
        },
      ],
      exports: [ConfigService, configProvider.provide],
    };
  }

  private static async loadForRoot(
    options: ConfigModuleOptions,
  ): Promise<DynamicModule> {
    const envFilePaths = Array.isArray(options.envFilePath)
      ? options.envFilePath
      : [options.envFilePath || resolve(process.cwd(), '.env')];
    const parser = options.parser ?? getDefaultParser();
    // Variable that still has the value an earlier "forRoot" loaded is not
    // predefined (e.g. app bootstrapped again in the same process)
    const predefinedEnv = new Map(
      options.override
        ? []
        : Object.entries(process.env).filter(
            ([key, value]) => this.loadedEnv.get(key) !== value,
          ),
    );
    const expandOptions: DotenvExpandOptions =
      typeof options.expandVariables === 'object'
        ? options.expandVariables
        : {};

    const envFileConfig = options.ignoreEnvFile
      ? {}
      : readEnvFiles(envFilePaths, parser);
    let config: Record<string, any> = { ...envFileConfig };
    // Predefined variable that is empty is replaced by the expanded value from
    // the env file, same as in dotenv-expand
    let replaceableKeys: string[] = [];
    if (options.expandVariables) {
      config = this.expandVariables(config, expandOptions, options.override);
      replaceableKeys = options.override
        ? []
        : Object.keys(config).filter(key => process.env[key] === '');
    }
    const fileKeys = new Set(Object.keys(config));
    const env: Record<string, string | undefined> = { ...process.env };
    replaceableKeys.forEach(key => delete env[key]);

    const validatePredefined =
      !options.ignoreEnvVars && options.validatePredefined !== false;
    if (validatePredefined) {
      config = options.override ? { ...env, ...config } : { ...config, ...env };
    }
    // Copy of the validator's input, taken before a "validate" function can
    // mutate it
    const input = { ...config };
    // Variables that only come from process.env
    const envOnlyKeys = new Set(
      validatePredefined
        ? Object.keys(env).filter(key => !fileKeys.has(key))
        : [],
    );

    let validatedEnvConfig: Record<string, any> | undefined = undefined;
    if (options.validate) {
      validatedEnvConfig = await options.validate(config);
    } else if (options.validationSchema) {
      const { error, value: validatedConfig } =
        await validateWithStandardSchema(
          options.validationSchema,
          config,
          options.validationOptions,
        );

      if (error) {
        throw new Error(`Config validation error: ${error.message}`);
      }
      validatedEnvConfig = this.mergeUndeclaredVariables(
        input,
        validatedConfig,
        getDeclaredKeys(options.validationSchema),
        // "skipProcessEnv" keeps undeclared variables of process.env out
        options.skipProcessEnv ? envOnlyKeys : new Set(),
      );
    }

    let convertedKeys = new Set<string>();
    if (isObject(validatedEnvConfig)) {
      validatedEnvConfig = this.createValidatedEnv(
        validatedEnvConfig,
        input,
        // Unless predefined variables are validated, "get" returns them as
        // they are, not the values from the env file that they take
        // precedence over (unless it skips process.env)
        !validatePredefined && !options.override && !options.skipProcessEnv
          ? [...predefinedEnv.keys()].filter(
              key => !replaceableKeys.includes(key),
            )
          : [],
      );
      convertedKeys = this.getConvertedKeys(validatedEnvConfig, input);
      this.assignVariablesToProcess(
        validatedEnvConfig,
        options.override,
        replaceableKeys,
      );
    } else {
      validatedEnvConfig = undefined;
      this.assignVariablesToProcess(config, options.override, replaceableKeys);
    }

    const isConfigToLoad = options.load && options.load.length;
    const configFactory = await Promise.all(options.load || []);
    const configProviders = configFactory
      .map(factory =>
        createConfigProvider(factory as ConfigFactory & ConfigFactoryKeyHost),
      )
      .filter(item => item);

    const configProviderTokens = configProviders.map(item => item.provide);
    const providers: FactoryProvider[] = [...configProviders];
    if (isConfigToLoad) {
      providers.push({
        provide: CONFIGURATION_LOADER,
        useFactory: (
          host: Record<string, any>,
          ...configurations: Record<string, any>[]
        ) => {
          configurations.forEach((item, index) =>
            this.mergePartial(host, item, configProviders[index]),
          );
        },
        inject: [CONFIGURATION_TOKEN, ...configProviderTokens],
      });
    }
    if (validatedEnvConfig) {
      const ownValidatedEnv = validatedEnvConfig;
      providers.push({
        provide: VALIDATED_ENV_LOADER,
        useFactory: (host: Record<string | symbol, any>) => {
          const stored = host[VALIDATED_ENV_PROPNAME];
          host[VALIDATED_ENV_PROPNAME] = stored
            ? this.mergeValidatedEnv(stored, ownValidatedEnv, convertedKeys)
            : ownValidatedEnv;
        },
        inject: [CONFIGURATION_TOKEN],
      });
    }
    providers.push({
      provide: ConfigService,
      useFactory: (
        configService: ConfigService,
        configLoaded: ConfigLoadedSignal,
      ) => {
        const untypedConfigService = configService as any;
        if (options.cache) {
          untypedConfigService.isCacheEnabled = true;
        }
        if (options.skipProcessEnv) {
          untypedConfigService.skipProcessEnv = true;
        }

        // Env file definitions are only used by "set", to update expanded
        // variables. They are the ones loaded (and validated) here, the files
        // are not read again
        untypedConfigService.setEnvFileConfig(
          options.expandVariables ? envFileConfig : {},
        );
        untypedConfigService.setExpansionEnv(expandOptions.processEnv);
        untypedConfigService.setPredefinedEnv(predefinedEnv, this.loadedEnv);
        configLoaded.resolve();
        return configService;
      },
      // Waits for the configuration to be loaded and validated
      inject: [
        CONFIGURATION_SERVICE_TOKEN,
        CONFIGURATION_LOADED,
        ...(isConfigToLoad ? [CONFIGURATION_LOADER] : []),
        ...(validatedEnvConfig ? [VALIDATED_ENV_LOADER] : []),
      ],
    });

    this.environmentVariablesLoadedSignal();

    return {
      module: ConfigModule,
      global: options.isGlobal,
      imports: [ConfigLoadedModule],
      providers,
      exports: [ConfigService, ...configProviderTokens],
    };
  }

  private static async waitForPendingForRoot(): Promise<void> {
    while (this.pendingForRootCalls.size > 0) {
      await Promise.allSettled(this.pendingForRootCalls);
    }
  }

  private static expandVariables(
    config: Record<string, any>,
    expandOptions: DotenvExpandOptions,
    override?: boolean,
  ): Record<string, any> {
    // "dotenv-expand" writes the expanded values to "processEnv". Unless the
    // options name a target, it gets a copy of process.env: the values are
    // assigned to process.env once they have been validated
    const target = expandOptions.processEnv;
    const processEnv: Record<string, any> = { ...(target ?? process.env) };
    if (override) {
      // "dotenv-expand" gives precedence to the values that are already
      // present in "processEnv" over the ones parsed from the file, which
      // would silently undo the "override" option. The variables the file
      // defines are removed from the copy, so that they are expanded from the
      // file instead (and a self-reference doesn't expand forever)
      Object.keys(config).forEach(key => delete processEnv[key]);
    }
    const expanded =
      expand({ ...expandOptions, parsed: config, processEnv }).parsed || config;
    if (target) {
      Object.assign(target, expanded);
    }
    return expanded;
  }

  /**
   * Object schemas strip the properties they don't declare (e.g. Zod), so the
   * undeclared variables are merged back in to keep them available through
   * process.env and ConfigService. Variables the schema declares are taken
   * from its output only, so a variable it removed (e.g. Joi's `strip()`)
   * stays removed.
   */
  private static mergeUndeclaredVariables(
    input: Record<string, any>,
    output: Record<string, any>,
    declaredKeys: Set<string> | undefined,
    excludedKeys: Set<string>,
  ): Record<string, any> {
    const isDeclared = (key: string) =>
      declaredKeys ? declaredKeys.has(key) : hasOwn(output, key);
    const merged: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!isDeclared(key) && !excludedKeys.has(key)) {
        merged[key] = value;
      }
    }
    for (const [key, value] of Object.entries(output)) {
      if (isDeclared(key) || !excludedKeys.has(key)) {
        merged[key] = value;
      }
    }
    return merged;
  }

  /**
   * Returns a copy of the validator's output to be served by
   * `ConfigService#get`. A variable that the validator maps to `undefined`
   * stays in it, so that `get` doesn't fall back to its raw value in
   * process.env.
   */
  private static createValidatedEnv(
    output: Record<string, any>,
    input: Record<string, any>,
    removedKeys: string[],
  ): Record<string, any> {
    const validatedEnv: Record<string, any> = Object.assign(
      Object.create(Object.getPrototypeOf(output)),
      output,
    );
    for (const key of Object.keys(validatedEnv)) {
      if (validatedEnv[key] === undefined && input[key] === undefined) {
        delete validatedEnv[key];
      }
    }
    for (const key of removedKeys) {
      delete validatedEnv[key];
    }
    return validatedEnv;
  }

  /**
   * Returns the variables the validator converted (or added), as opposed to
   * the ones it passed through as they were
   */
  private static getConvertedKeys(
    validatedEnv: Record<string, any>,
    input: Record<string, any>,
  ): Set<string> {
    return new Set(
      Object.keys(validatedEnv).filter(
        key => !hasOwn(input, key) || validatedEnv[key] !== input[key],
      ),
    );
  }

  /**
   * Merges the validated variables of another "forRoot" into the stored ones.
   * Values a validator converted win, values it only passed through (e.g.
   * the raw form of a variable that another schema converted) don't replace
   * what is stored.
   */
  private static mergeValidatedEnv(
    stored: Record<string, any>,
    validatedEnv: Record<string, any>,
    convertedKeys: Set<string>,
  ): Record<string, any> {
    const merged: Record<string, any> = Object.assign(
      Object.create(Object.getPrototypeOf(stored)),
      stored,
    );
    for (const [key, value] of Object.entries(validatedEnv)) {
      if (convertedKeys.has(key) || !hasOwn(merged, key)) {
        merged[key] = value;
      }
    }
    return merged;
  }

  private static assignVariablesToProcess(
    config: Record<string, unknown>,
    override?: boolean,
    replaceableKeys: string[] = [],
  ): void {
    if (!isObject(config)) {
      return;
    }
    const keys = override
      ? Object.keys(config)
      : Object.keys(config).filter(
          key => !(key in process.env) || replaceableKeys.includes(key),
        );

    keys.forEach(key => {
      const value = config[key];
      if (typeof value === 'string') {
        process.env[key] = value;
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        process.env[key] = `${value}`;
      } else {
        return;
      }
      this.loadedEnv.set(key, process.env[key]);
    });
  }

  private static mergePartial(
    host: Record<string, any>,
    item: Record<string, any>,
    provider: FactoryProvider,
  ): void {
    const factoryRef = provider.useFactory;
    const token = getRegistrationToken(factoryRef);
    mergeConfigObject(host, item, token);
  }
}
