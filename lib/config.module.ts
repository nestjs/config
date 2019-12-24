import { DynamicModule, Module } from '@nestjs/common';
import { FactoryProvider } from '@nestjs/common/interfaces';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { resolve } from 'path';
import { isObject } from 'util';
import { ConfigHostModule } from './config-host.module';
import {
  CONFIGURATION_LOADER,
  CONFIGURATION_SERVICE_TOKEN,
  CONFIGURATION_TOKEN,
} from './config.constants';
import { ConfigService } from './config.service';
import { ConfigFactory, ConfigModuleOptions } from './interfaces';
import { createConfigProvider } from './utils/create-config-factory.util';
import { getRegistrationToken } from './utils/get-registration-token.util';
import { mergeConfigObject } from './utils/merge-configs.util';

@Module({
  imports: [ConfigHostModule],
  providers: [
    { provide: ConfigService, useExisting: CONFIGURATION_SERVICE_TOKEN },
  ],
  exports: [ConfigHostModule, ConfigService],
})
export class ConfigModule {
  /**
   * Loads process environment variables depending on the "ignoreEnvFile" flag and "envFilePath" value.
   * Also, registers custom configurations globally.
   * @param options
   */
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    let config = { ...process.env };
    if (!options.ignoreEnvFile) {
      config = { ...this.loadEnvFile(options), ...config };
    }
    if (options.validationSchema) {
      const validationOptions = this.getSchemaValidationOptions(options);
      const {
        error,
        value: validatedConfig,
      } = options.validationSchema.validate(config, validationOptions);

      if (error) {
        throw new Error(`Config validation error: ${error.message}`);
      }
      config = validatedConfig;
    }

    this.assignVariablesToProcess(config);

    const isConfigToLoad = options.load && options.load.length;
    const providers = (options.load || [])
      .map(factory => createConfigProvider(factory))
      .filter(item => item) as FactoryProvider[];

    const configProviderTokens = providers.map(item => item.provide);
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
    };
  }

  /**
   * Registers configuration object (partial registration).
   * @param config
   */
  static forFeature(config: ConfigFactory) {
    const configProvider = createConfigProvider(config);
    return {
      module: ConfigModule,
      providers: [
        configProvider,
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
    };
  }

  private static loadEnvFile(
    options: ConfigModuleOptions,
  ): Record<string, any> {
    try {
      const envFilePath = options.envFilePath || resolve(process.cwd(), '.env');
      const config = dotenv.parse(fs.readFileSync(envFilePath));
      return config;
    } catch (err) {
      if (options.envFilePath || (err && err.code !== 'ENOENT')) {
        throw err;
      }
      return {};
    }
  }

  private static assignVariablesToProcess(config: Record<string, any>) {
    if (!isObject(config)) {
      return;
    }
    const keys = Object.keys(config).filter(key => !(key in process.env));
    keys.forEach(key => (process.env[key] = config[key]));
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
    return (
      options.validationOptions || {
        abortEarly: false,
        allowUnknown: true,
      }
    );
  }
}
