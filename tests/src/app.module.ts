import { DynamicModule, Inject, Module, Optional } from '@nestjs/common';
import Joi from 'joi';
import { join } from 'path';
import { ConfigFactory, ConfigType } from '../../lib';
import { ConfigModule } from '../../lib/config.module';
import { ConfigService } from '../../lib/config.service';
import { ValidationClassDTO } from './validation.dto'
import databaseConfig from './database.config';
import nestedDatabaseConfig from './nested-database.config';
import symbolDatabaseConfig, { DATABASE_SYMBOL_TOKEN } from './symbol-database.config';

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
   * types defintions while runnig test suites (in some sort).
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
          envFilePath: join(__dirname, '.env'),
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
          envFilePath: join(__dirname, '.env'),
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
          envFilePath: join(__dirname, '.env'),
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
          envFilePath: join(__dirname, '.env.expanded'),
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
          envFilePath: join(__dirname, '.env.expanded'),
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
          envFilePath: join(__dirname, '.env'),
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
          envFilePath: [join(__dirname, '.env.local'), join(__dirname, '.env')],
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

  static withSchemaValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          ignoreEnvFile,
          validationSchema: Joi.object({
            PORT: Joi.number().required(),
            DATABASE_NAME: Joi.string().required(),
          }),
        }),
      ],
    };
  }

  static withClassValidation(
    envFilePath?: string,
    ignoreEnvFile?: boolean,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          ignoreEnvFile,
          validationClass: ValidationClassDTO,
        }),
      ],
    };
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
