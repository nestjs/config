import { Global, Module } from '@nestjs/common';
import { CONFIGURATION_LOADED } from './config.constants.js';

/**
 * Resolved by the `ConfigService` provider of `ConfigModule.forRoot()` once
 * the configuration is loaded (including async "load" factories).
 */
export interface ConfigLoadedSignal {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * Imported by `ConfigModule.forRoot()` only, so that a `ConfigModule` import
 * without any `forRoot()` call doesn't wait for a signal that never comes.
 */
@Global()
@Module({
  providers: [
    {
      provide: CONFIGURATION_LOADED,
      useFactory: (): ConfigLoadedSignal => {
        let resolve!: () => void;
        const promise = new Promise<void>(res => (resolve = res));
        return { promise, resolve };
      },
    },
  ],
  exports: [CONFIGURATION_LOADED],
})
export class ConfigLoadedModule {}
