import { ConfigObject } from '../types';
import { ConfigService } from '../config.service';

type ConfigFactoryReturnValue<T extends ConfigObject> = T | Promise<T>;

export type ConfigFactory<T extends ConfigObject = ConfigObject> = (
  configService: ConfigService,
  _: { readonly ____: unique symbol }, // make sure no one can use this parameter
) => ConfigFactoryReturnValue<T>;
