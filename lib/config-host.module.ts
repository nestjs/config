import { Global, Module } from '@nestjs/common';
import {
  CONFIGURATION_SERVICE_TOKEN,
  CONFIGURATION_TOKEN,
} from './config.constants.js';
import { ConfigService } from './config.service.js';

/**
 * @publicApi
 */
@Global()
@Module({
  providers: [
    {
      provide: CONFIGURATION_TOKEN,
      useFactory: () => ({}),
    },
    {
      provide: CONFIGURATION_SERVICE_TOKEN,
      useClass: ConfigService,
    },
  ],
  exports: [CONFIGURATION_TOKEN, CONFIGURATION_SERVICE_TOKEN],
})
export class ConfigHostModule {}
