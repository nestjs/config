import { DynamicModule, Inject, Module, Optional } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import Joi from 'joi';
import { z as zv3 } from 'zod/v3';
import { z as zv4 } from 'zod/v4';
import * as zv4Mini from 'zod/mini';
import { fileURLToPath } from 'node:url';
import { join } from 'path';
import { ConfigFactory, ConfigType } from '../../lib/index.js';
import { ConfigModule } from '../../lib/config.module.js';
import { ConfigService } from '../../lib/config.service.js';
import databaseConfig from './database.config.js';
import nestedDatabaseConfig from './nested-database.config.js';
import symbolDatabaseConfig, { DATABASE_SYMBOL_TOKEN } from './symbol-database.config.js';

const testSrcDir = fileURLToPath(new URL('.', import.meta.url));

type Config = {
  database: ConfigType<typeof databaseConfig> & {
    driver: ConfigType<typeof nestedDatabaseConfig>;
  };
};

interface ConfigTypeAsInterface {
  database: ConfigType<typeof databaseConfig> & {
    driver: ConfigType<typeof nestedDatabaseConfig>;
  };
}
@Module({})
export class AppModule {
  constructor(
    private readonly configService: ConfigService,
    // The following is the same object as above but narrowing its types
    private readonly configServiceNarrowed: ConfigService<Config, true>,
    private readonly configServiceNarrowed2: ConfigService<
      ConfigTypeAsInterface,
      true
    >,
    @Optional()
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

  /**
   * This method is not meant to be used anywhere! It just here for testing
   * types definitions while runnnig test suites (in some sort).
   * If some typings doesn't follows the requirements, Jest will fail due to
   * TypeScript errors.
   */
  private noop(): void {
    // Arrange
    const identityString = (v: string) => v;
    const identityNumber = (v: number) => v;
    // Act
    const knowConfig =
      this.configServiceNarrowed.get<Config['database']>('database');
    // Assert
    // We don't need type assertions bellow anymore since `knowConfig` is not
    // expected to be `undefined` beforehand.
    identityString(knowConfig.host);
    identityNumber(knowConfig.port);
    identityString(knowConfig.driver.host);
    identityNumber(knowConfig.driver.port);
  }

  static withCache(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          cache: true,
          envFilePath: join(testSrcDir, '.env'),
          load: [databaseConfig],
        }),
      ],
    };
  }

  static withSkipProcessEnv(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(testSrcDir, '.env'),
          load: [() => ({ obj: { test: 'true', test2: undefined } })],
          skipProcessEnv: true,
        }),
      ],
    };
  }

  static withEnvVars(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(testSrcDir, '.env'),
          load: [() => ({ obj: { test: 'true', test2: undefined } })],
        }),
      ],
    };
  }

  static withExpandedEnvVars(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(testSrcDir, '.env.expanded'),
          expandVariables: true,
        }),
      ],
    };
  }

  static withExpandedEnvVarsIgnoreProcessEnv(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(testSrcDir, '.env.expanded'),
          expandVariables: { processEnv: {} },
        }),
      ],
    };
  }

  static withEnvVarsAndLoadedConfigurations(
    configFactory: ConfigFactory[],
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(testSrcDir, '.env'),
          load: configFactory,
        }),
      ],
    };
  }

  static withMultipleEnvFiles(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: [join(testSrcDir, '.env.local'), join(testSrcDir, '.env')],
        }),
      ],
    };
  }

  static withLoadedConfigurations(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: [databaseConfig],
        }),
      ],
    };
  }

  static withLoadedAsyncConfigurations() {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: [Promise.resolve(databaseConfig)],
        }),
      ],
    };
  }

  static withNestedLoadedConfigurations(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: [nestedDatabaseConfig],
        }),
      ],
    };
  }

  static withSymbolLoadedConfigurations(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: [symbolDatabaseConfig],
        }),
      ],
    };
  }

  static withDynamicLoadedConfigurations(
    configFactory: ConfigFactory[],
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: configFactory,
        }),
      ],
    };
  }

  static withStandardSchemaValidation(
    validationSchema: StandardSchemaV1,
    envFilePath?: string,
    ignoreEnvFile?: boolean,
    validationOptions?: StandardSchemaV1.Options,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          ignoreEnvFile,
          validationSchema,
          validationOptions,
        }),
      ],
    };
  }

  static withSchemaValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
    validationOptions?: StandardSchemaV1.Options,
  ): DynamicModule {
    return AppModule.withStandardSchemaValidation(
      Joi.object({
        PORT: Joi.number().required(),
        DATABASE_NAME: Joi.string().required(),
      }),
      envFilePath,
      ignoreEnvFile,
      validationOptions,
    );
  }

  static withZodV3SchemaValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return AppModule.withStandardSchemaValidation(
      zv3.object({
        PORT: zv3.string().transform((val: string) => parseInt(val, 10)),
        DATABASE_NAME: zv3.string(),
      }),
      envFilePath,
      ignoreEnvFile,
    );
  }

  static withZodV4SchemaValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return AppModule.withStandardSchemaValidation(
      zv4.object({
        PORT: zv4.string().transform((val: string) => parseInt(val, 10)),
        DATABASE_NAME: zv4.string(),
      }),
      envFilePath,
      ignoreEnvFile,
    );
  }

  static withZodV4MiniSchemaValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return AppModule.withStandardSchemaValidation(
      zv4Mini.object({
        PORT: zv4Mini.coerce.number(),
        DATABASE_NAME: zv4Mini.string(),
      }),
      envFilePath,
      ignoreEnvFile,
    );
  }

  static withValidateFunction(
    validate: (config: Record<string, any>) => Record<string, any>,
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          ignoreEnvFile,
          validate,
        }),
      ],
    };
  }

  static withForFeature(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(),
        ConfigModule.forFeature(databaseConfig),
      ],
    };
  }

  getEnvVariables() {
    return process.env;
  }

  getDatabaseHost() {
    return this.configService.get('database.host');
  }

  getDatabaseConfig() {
    return this.dbConfig;
  }

  getNestedDatabaseHost() {
    return this.configService.get('database.driver.host');
  }

  getSymbolDatabaseConfig() {
    return this.configService.get(DATABASE_SYMBOL_TOKEN)
  }
}
