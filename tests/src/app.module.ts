import Joi from '@hapi/joi';
import { DynamicModule, Inject, Module, Optional } from '@nestjs/common';
import { join } from 'path';
import { ConfigType } from '../../lib';
import { ConfigModule } from '../../lib/config.module';
import { ConfigService } from '../../lib/config.service';
import databaseConfig from './database.config';
import nestedDatabaseConfig from './nested-database.config';
import sameKeyDatabaseConfig from './same-key-database.config';

@Module({})
export class AppModule {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

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

  static withEnvVars(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(__dirname, '.env'),
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

  static withLoadedSameKeyConfigurations(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: join(__dirname, '.env'),
          load: [sameKeyDatabaseConfig],
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

  getPortInSameKeyConfig() {
    return this.configService.get('PORT');
  }
}
