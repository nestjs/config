import { FactoryProvider } from '@nestjs/common/interfaces';
import { ConfigFactory } from '../interfaces';
import { getConfigToken } from './get-config-token.util';
import { ConfigFactoryKeyHost } from './register-as.util';
import { randomUUID } from "crypto";

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
