import * as Joi from '@hapi/joi';
import { DynamicModule, Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule } from '../../lib/config.module';
import { ConfigService } from '../../lib/config.service';
import databaseConfig from './database.config';
import { DATABASE_PORT } from './database.contants';

@Module({})
export class AppModule {
  constructor(private readonly configService: ConfigService) {}

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

  static withSchemaValidation(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
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

  getEnvVariables() {
    return process.env;
  }

  getDatabaseHost() {
    return this.configService.get('database.host');
  }

  getDatabasePort() {
    return this.configService.getByKey(DATABASE_PORT);
  }
}
