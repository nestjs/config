import { FactoryProvider } from '@nestjs/common/interfaces';
import uuid from 'uuid/v4';
import { ConfigFactory } from '../interfaces';
import { getConfigToken } from './get-config-token.util';

export function createConfigProvider(factory: ConfigFactory): FactoryProvider {
  const uniqId = uuid();
  return {
    provide: getConfigToken(uniqId),
    useFactory: factory,
    inject: [],
  };
}
