import { FactoryProvider } from '@nestjs/common/interfaces';
import uuid from 'uuid/v4';
import { ConfigFactory } from '../interfaces';
import { getConfigToken } from './get-config-token.util';
import { ConfigFactoryKeyHost } from './register-as.util';

export function createConfigProvider(
  factory: ConfigFactory & ConfigFactoryKeyHost,
): FactoryProvider {
  const uniqId = uuid();
  return {
    provide: factory.KEY || getConfigToken(uniqId),
    useFactory: factory,
    inject: [],
  };
}
