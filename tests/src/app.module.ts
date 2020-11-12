import Joi from '@hapi/joi';
import { DynamicModule, Inject, Module, Optional } from '@nestjs/common';
import { join } from 'path';
import { ConfigType } from '../../lib';
import { ConfigModule } from '../../lib/config.module';
import { ConfigService } from '../../lib/config.service';
import databaseConfig from './database.config';
import nestedDatabaseConfig from './nested-database.config';

@Module({})
export class AppModule {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

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

  static withForFeature(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(),
        ConfigModule.forFeature(databaseConfig),
      ],
    };
  }

  static withYmlConfigurations(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          ymlFilePath: [join(__dirname, 'config.yml')],
          useYmlFile: true,
        }),
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
}
