import { ConfigService } from '../config.service';

type ConfigFactoryReturnValue =
  | Record<string, any>
  | Promise<Record<string, any>>;

export type ConfigFactory =
  | (() => ConfigFactoryReturnValue)
  | ((configService: ConfigService) => ConfigFactoryReturnValue);
