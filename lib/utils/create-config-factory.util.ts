import { FactoryProvider } from '@nestjs/common/interfaces/index.js';
import { randomUUID } from 'crypto';
import { ConfigFactory } from '../interfaces/index.js';
import { getConfigToken } from './get-config-token.util.js';
import { ConfigFactoryKeyHost } from './register-as.util.js';

/**
 * @publicApi
 */
export function createConfigProvider(
  factory: ConfigFactory & ConfigFactoryKeyHost,
): FactoryProvider {
  return {
    provide: factory.KEY || getConfigToken(randomUUID()),
    useFactory: factory,
    inject: [],
  };
}
