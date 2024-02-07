import { DynamicModule, Module } from '@nestjs/common';
import { FactoryProvider } from '@nestjs/common/interfaces';
import { isObject } from '@nestjs/common/utils/shared.utils';
import * as dotenv from 'dotenv';
import { DotenvExpandOptions, expand } from 'dotenv-expand';
import * as fs from 'fs';
import { resolve } from 'path';
import { ConfigHostModule } from './config-host.module';
import {
  CONFIGURATION_LOADER,
  CONFIGURATION_SERVICE_TOKEN,
  CONFIGURATION_TOKEN,
  VALIDATED_ENV_LOADER,
  VALIDATED_ENV_PROPNAME,
} from './config.constants';
import { ConfigService } from './config.service';
import { ConfigFactory, ConfigModuleOptions } from './interfaces';
import { ConfigFactoryKeyHost } from './utils';
import { createConfigProvider } from './utils/create-config-factory.util';
import { getRegistrationToken } from './utils/get-registration-token.util';
import { mergeConfigObject } from './utils/merge-configs.util';

/**
 * @publicApi
 */
@Module({
  imports: [ConfigHostModule],
  providers: [
    {
      provide: ConfigService,
      useExisting: CONFIGURATION_SERVICE_TOKEN,
    },
  ],
  exports: [ConfigHostModule, ConfigService],
})
export class ConfigModule {
  /**
   * This promise resolves when "dotenv" completes loading environment variables.
   * When "ignoreEnvFile" is set to true, then it will resolve immediately after the
   * "ConfigModule#forRoot" method is called.
   */
  public static get envVariablesLoaded() {
    return this._envVariablesLoaded;
  }

  private static environmentVariablesLoadedSignal: () => void;
  private static readonly _envVariablesLoaded = new Promise<void>(
    resolve => (ConfigModule.environmentVariablesLoadedSignal = resolve),
  );

  /**
   * Loads process environment variables depending on the "ignoreEnvFile" flag and "envFilePath" value.
   * Also, registers custom configurations globally.
   * @param options
   */
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    const envFilePaths = Array.isArray(options.envFilePath)
      ? options.envFilePath
      : [options.envFilePath || resolve(process.cwd(), '.env')];

    let validatedEnvConfig: Record<string, any> | undefined = undefined;
    let config = options.ignoreEnvFile
      ? {}
      : this.loadEnvFile(envFilePaths, options);

    if (!options.ignoreEnvVars) {
      config = {
        ...config,
        ...process.env,
      };
    }
    if (options.validate) {
      const validatedConfig = options.validate(config);
      validatedEnvConfig = validatedConfig;
      this.assignVariablesToProcess(validatedConfig);
    } else if (options.validationSchema) {
      const validationOptions = this.getSchemaValidationOptions(options);
      const { error, value: validatedConfig } =
        options.validationSchema.validate(config, validationOptions);

      if (error) {
        throw new Error(`Config validation error: ${error.message}`);
      }
      validatedEnvConfig = validatedConfig;
      this.assignVariablesToProcess(validatedConfig);
    } else {
      this.assignVariablesToProcess(config);
    }

    const isConfigToLoad = options.load && options.load.length;
    const providers = (options.load || [])
      .map(factory =>
        createConfigProvider(factory as ConfigFactory & ConfigFactoryKeyHost),
      )
      .filter(item => item) as FactoryProvider[];

    const configProviderTokens = providers.map(item => item.provide);
    const configServiceProvider = {
      provide: ConfigService,
      useFactory: (configService: ConfigService) => {
        if (options.cache) {
          (configService as any).isCacheEnabled = true;
        }
        configService.setEnvFilePaths(envFilePaths);
        return configService;
      },
      inject: [CONFIGURATION_SERVICE_TOKEN, ...configProviderTokens],
    };
    providers.push(configServiceProvider);

    if (validatedEnvConfig) {
      const validatedEnvConfigLoader = {
        provide: VALIDATED_ENV_LOADER,
        useFactory: (host: Record<string, any>) => {
          host[VALIDATED_ENV_PROPNAME] = validatedEnvConfig;
        },
        inject: [CONFIGURATION_TOKEN],
      };
      providers.push(validatedEnvConfigLoader);
    }

    this.environmentVariablesLoadedSignal();

    return {
      module: ConfigModule,
      global: options.isGlobal,
      providers: isConfigToLoad
        ? [
            ...providers,
            {
              provide: CONFIGURATION_LOADER,
              useFactory: (
                host: Record<string, any>,
                ...configurations: Record<string, any>[]
              ) => {
                configurations.forEach((item, index) =>
                  this.mergePartial(host, item, providers[index]),
                );
              },
              inject: [CONFIGURATION_TOKEN, ...configProviderTokens],
            },
          ]
        : providers,
      exports: [ConfigService, ...configProviderTokens],
    };
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
      useFactory: (configService: ConfigService) => configService,
      inject: [CONFIGURATION_SERVICE_TOKEN, configProvider.provide],
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

  private static loadEnvFile(
    envFilePaths: string[],
    options: ConfigModuleOptions,
  ): Record<string, any> {
    let config: ReturnType<typeof dotenv.parse> = {};
    for (const envFilePath of envFilePaths) {
      if (fs.existsSync(envFilePath)) {
        config = Object.assign(
          dotenv.parse(fs.readFileSync(envFilePath)),
          config,
        );
        if (options.expandVariables) {
          const expandOptions: DotenvExpandOptions =
            typeof options.expandVariables === 'object'
              ? options.expandVariables
              : {};
          config =
            expand({ ...expandOptions, parsed: config }).parsed || config;
        }
      }
    }
    return config;
  }

  private static assignVariablesToProcess(config: Record<string, unknown>) {
    if (!isObject(config)) {
      return;
    }
    const keys = Object.keys(config).filter(key => !(key in process.env));
    keys.forEach(key => {
      const value = config[key];
      if (typeof value === 'string') {
        process.env[key] = value;
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        process.env[key] = `${value}`;
      }
    });
  }

  private static mergePartial(
    host: Record<string, any>,
    item: Record<string, any>,
    provider: FactoryProvider,
  ) {
    const factoryRef = provider.useFactory;
    const token = getRegistrationToken(factoryRef);
    mergeConfigObject(host, item, token);
  }

  private static getSchemaValidationOptions(options: ConfigModuleOptions) {
    if (options.validationOptions) {
      if (typeof options.validationOptions.allowUnknown === 'undefined') {
        options.validationOptions.allowUnknown = true;
      }
      return options.validationOptions;
    }
    return {
      abortEarly: false,
      allowUnknown: true,
    };
  }
}
