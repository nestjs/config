import { DynamicModule, Module } from '@nestjs/common';
import { ValueProvider } from '@nestjs/common/interfaces';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ConfigHostModule } from './config-host.module';
import { CONFIGURATION_LOADER, CONFIGURATION_TOKEN } from './config.constants';
import { getConfigToken } from './utils';
import { getRegistrationToken } from './utils/get-registration-token.util';
import { mergeConfigObjects } from './utils/merge-configs.util';

export interface ConfigModuleOptions {
  isGlobal?: boolean;
  ignoreEnvFile?: boolean;
  envFilePath?: string;
  encoding?: string;
  validationSchema?: any;
  load?: Array<Record<string, any>>;
}

@Module({
  imports: [ConfigHostModule],
  exports: [ConfigHostModule],
})
export class ConfigModule {
  /**
   * Loads process environment variables depending on the "ignoreEnvFile" flag and "envFilePath" value.
   * Also, registers custom configurations globally.
   * @param options
   */
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    const envProviders: any[] = [];
    if (!options.ignoreEnvFile) {
      const config = this.loadEnvFile(options);
      if (options.validationSchema) {
        const {
          error,
          value: validatedConfig,
        } = options.validationSchema.validate(config);

        if (error) {
          throw new Error(`Config validation error: ${error.message}`);
        }
        if (options.envFilePath) {
          Object.assign(process.env, validatedConfig);
        }
      } else {
        if (options.envFilePath) {
          Object.assign(process.env, config);
        }
      }
      Object.keys(config).forEach(token => {
        envProviders.push({
          provide: getConfigToken(token),
          useValue: config[token],
        } as ValueProvider);
      });
    }
    const hasConfigsToLoad = options.load && options.load.length;
    const providers = (options.load || [])
      .map(item => {
        const token = getRegistrationToken(item);
        if (!token) {
          return undefined;
        }
        return {
          provide: getConfigToken(token),
          useValue: item,
        } as ValueProvider;
      })
      .filter(item => item) as ValueProvider[];

    return {
      module: ConfigModule,
      global: options.isGlobal,
      providers: hasConfigsToLoad
        ? [
            ...envProviders,
            ...providers,
            {
              provide: CONFIGURATION_LOADER,
              useFactory: (configHost: Record<string, any>) => {
                options.load!.forEach(item =>
                  mergeConfigObjects(configHost, item),
                );
              },
              inject: [CONFIGURATION_TOKEN],
            },
          ]
        : [...envProviders, ...providers],
      exports: [...envProviders, ...providers],
    };
  }

  /**
   * Registers configuration object (partial registration).
   * @param config
   */
  static forFeature(config: Record<string, any>) {
    const token = getRegistrationToken(config);
    const providers = token
      ? [
          {
            provide: getConfigToken(token),
            useValue: config,
          },
        ]
      : [];

    return {
      module: ConfigModule,
      providers: [
        ...providers,
        {
          provide: CONFIGURATION_LOADER,
          useFactory: (configHost: Record<string, any>) => {
            mergeConfigObjects(configHost, config);
          },
          inject: [CONFIGURATION_TOKEN],
        },
      ],
      exports: [...providers],
    };
  }

  private static loadEnvFile(
    options: ConfigModuleOptions,
  ): Record<string, any> {
    const config = options.envFilePath
      ? dotenv.parse(fs.readFileSync(options.envFilePath))
      : dotenv.config({ encoding: options.encoding }).parsed;
    return config || {};
  }
}
