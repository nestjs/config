import { Global, Module } from '@nestjs/common';
import { CONFIGURATION_TOKEN } from './config.constants';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [
    {
      provide: CONFIGURATION_TOKEN,
      useValue: {},
    },
    ConfigService,
  ],
  exports: [CONFIGURATION_TOKEN, ConfigService],
})
export class ConfigHostModule {}
