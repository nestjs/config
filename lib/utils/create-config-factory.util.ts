import { FactoryProvider } from '@nestjs/common/interfaces';
import uuid from 'uuid/v4';
import { getConfigToken } from '.';
import { ConfigService } from '..';
import { ConfigFactory } from '../interfaces';

export function createConfigProvider(factory: ConfigFactory): FactoryProvider {
  const uniqId = uuid();
  return {
    provide: getConfigToken(uniqId),
    useFactory: factory,
    inject: [ConfigService],
  };
}
