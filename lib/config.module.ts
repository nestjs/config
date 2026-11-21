import { DynamicModule, Module } from '@nestjs/common';
import { FactoryProvider, Provider } from '@nestjs/common/interfaces/index.js';
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
  LOAD_FACTORY_ENV,
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
import { ValidatedEnv } from './utils/validated-env.util.js';

interface LoadedEnv {
  envFileConfig: Record<string, any>;
  predefinedEnv: Map<string, string | undefined>;
  expandOptions: DotenvExpandOptions;
  validatedEnv?: {
    values: Record<string, any>;
    hiddenKeys: Set<string>;
    convertedKeys: Set<string>;
  };
}

// Name under which "expandVariables" passes the value a variable had before
// the env file was loaded, for the variable's references to itself
const PREVIOUS_VALUE_PREFIX = 'NESTJS_CONFIG_PREVIOUS_VALUE_OF_';

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
   * in progress has loaded its environment variables.
   */
  public static get envVariablesLoaded(): Promise<void> {
    return this._envVariablesLoaded.then(() => this.waitForPendingEnvLoads());
  }

  private static environmentVariablesLoadedSignal: () => void;
  private static readonly _envVariablesLoaded = new Promise<void>(
    resolve => (ConfigModule.environmentVariablesLoadedSignal = resolve),
  );
  private static readonly pendingEnvLoads = new Set<Promise<unknown>>();
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
    const loadingEnv = this.loadEnv(options);
    this.pendingEnvLoads.add(loadingEnv);
    let loadedEnv: LoadedEnv;
    try {
      loadedEnv = await loadingEnv;
    } finally {
      this.pendingEnvLoads.delete(loadingEnv);
    }
    this.environmentVariablesLoadedSignal();
    return this.createDynamicModule(options, loadedEnv);
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

  private static async loadEnv(
    options: ConfigModuleOptions,
  ): Promise<LoadedEnv> {
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
    let replaceableKeys = new Set<string>();
    if (options.expandVariables) {
      config = this.expandVariables(config, expandOptions, options.override);
      replaceableKeys = new Set(
        options.override
          ? []
          : Object.keys(config).filter(key => process.env[key] === ''),
      );
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

    let validatedEnv: LoadedEnv['validatedEnv'];
    if (isObject(validatedEnvConfig)) {
      const hiddenKeys = new Set<string>();
      for (const key of Object.keys(validatedEnvConfig)) {
        // "undefined" is a removal only if the validator was given a value
        if (validatedEnvConfig[key] === undefined && input[key] === undefined) {
          hiddenKeys.add(key);
        }
      }
      // Unless predefined variables are validated, "get" returns them as
      // they are, not the different values from the env file that they take
      // precedence over (unless it skips process.env)
      if (!validatePredefined && !options.override && !options.skipProcessEnv) {
        for (const [key, value] of predefinedEnv) {
          if (!replaceableKeys.has(key) && value !== input[key]) {
            hiddenKeys.add(key);
          }
        }
      }
      validatedEnv = {
        values: validatedEnvConfig,
        hiddenKeys,
        convertedKeys: this.getConvertedKeys(validatedEnvConfig, input),
      };
      this.assignVariablesToProcess(
        validatedEnvConfig,
        options.override,
        replaceableKeys,
      );
    } else {
      this.assignVariablesToProcess(config, options.override, replaceableKeys);
    }
    return { envFileConfig, predefinedEnv, expandOptions, validatedEnv };
  }

  private static async createDynamicModule(
    options: ConfigModuleOptions,
    { envFileConfig, predefinedEnv, expandOptions, validatedEnv }: LoadedEnv,
  ): Promise<DynamicModule> {
    const isConfigToLoad = options.load && options.load.length;
    const configFactory = await Promise.all(options.load || []);
    const configProviders = configFactory
      .map(factory =>
        createConfigProvider(
          factory as ConfigFactory & ConfigFactoryKeyHost,
          LOAD_FACTORY_ENV,
        ),
      )
      .filter(item => item);

    const configProviderTokens = configProviders.map(item => item.provide);
    const providers: Provider[] = [...configProviders];
    if (isConfigToLoad) {
      // What "load" factories get as their argument
      providers.push({
        provide: LOAD_FACTORY_ENV,
        useValue: validatedEnv?.values ?? process.env,
      });
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
    if (validatedEnv) {
      providers.push({
        provide: VALIDATED_ENV_LOADER,
        useFactory: (host: Record<string | symbol, any>) => {
          (host[VALIDATED_ENV_PROPNAME] ??= new ValidatedEnv()).add(
            validatedEnv.values,
            validatedEnv.hiddenKeys,
            validatedEnv.convertedKeys,
          );
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
        ...(validatedEnv ? [VALIDATED_ENV_LOADER] : []),
      ],
    });

    return {
      module: ConfigModule,
      global: options.isGlobal,
      imports: [ConfigLoadedModule],
      providers,
      exports: [ConfigService, ...configProviderTokens],
    };
  }

  private static async waitForPendingEnvLoads(): Promise<void> {
    while (this.pendingEnvLoads.size > 0) {
      await Promise.allSettled(this.pendingEnvLoads);
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
      // file instead (and a self-reference doesn't expand forever). A
      // variable's references to itself still mean the value it had before
      // (e.g. "PATH=/opt/bin:$PATH"), under another name
      for (const key of Object.keys(config)) {
        const previousValue = processEnv[key];
        delete processEnv[key];
        if (typeof config[key] !== 'string' || previousValue === undefined) {
          continue;
        }
        const alias = `${PREVIOUS_VALUE_PREFIX}${key}`;
        const value = this.renameSelfReferences(config[key], key, alias);
        if (value !== config[key]) {
          config[key] = value;
          processEnv[alias] = previousValue;
        }
      }
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
   * Replaces the references a value makes to its own variable ("key") with
   * references to "alias", in the syntax of dotenv-expand
   */
  private static renameSelfReferences(
    value: string,
    key: string,
    alias: string,
  ): string {
    // Names with an operator character can't be referenced as a whole
    if (/[:+-]/.test(key)) {
      return value;
    }
    const name = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let renamed = value.replace(
      new RegExp(`(?<!\\\\)\\$\\{${name}(?=[:+}-])`, 'g'),
      () => `\${${alias}`,
    );
    if (/^[A-Za-z_]\w*$/.test(key)) {
      renamed = renamed.replace(
        new RegExp(`(?<!\\\\)\\$${name}(?!\\w)`, 'g'),
        () => `\${${alias}}`,
      );
    }
    return renamed;
  }

  private static assignVariablesToProcess(
    config: Record<string, unknown>,
    override?: boolean,
    replaceableKeys = new Set<string>(),
  ): void {
    if (!isObject(config)) {
      return;
    }
    const keys = override
      ? Object.keys(config)
      : Object.keys(config).filter(
          key => !(key in process.env) || replaceableKeys.has(key),
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
