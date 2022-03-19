import { FactoryProvider } from '@nestjs/common/interfaces';
import { v4 as uuid } from 'uuid';
import { ConfigFactory } from '../interfaces';
import { getConfigToken } from './get-config-token.util';
import { ConfigFactoryKeyHost } from './register-as.util';
import {
  ASYNC_CONFIGURATION_LOADER,
  CONFIGURATION_SERVICE_TOKEN,
} from '../config.constants';

export function createConfigProvider(
  factory: ConfigFactory & ConfigFactoryKeyHost,
  skipAsyncLoader?: boolean,
): FactoryProvider {
  const uniqId = uuid();
  return {
    provide: factory.KEY || getConfigToken(uniqId),
    useFactory: factory,
    inject: skipAsyncLoader
      ? [CONFIGURATION_SERVICE_TOKEN]
      : [CONFIGURATION_SERVICE_TOKEN, ASYNC_CONFIGURATION_LOADER],
  };
}
