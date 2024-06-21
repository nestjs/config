import { DynamicModule, ForwardReference, Logger, ModuleMetadata, Type } from '@nestjs/common';
import { ConfigModule } from './config.module';

/**
 * Same logic as in `@nestjs/core` package.
 * @param instance The instance which should get the name from
 * @returns The name of an instance or `undefined`
 */
const getInstanceName = (instance: unknown): string | undefined => {
  if ((instance as ForwardReference)?.forwardRef) {
    return (instance as ForwardReference).forwardRef()?.name;
  }

  if ((instance as DynamicModule).module) {
    return (instance as DynamicModule).module?.name;
  }

  return (instance as Type).name;
};

/**
 * @publicApi
 */
export class ConditionalModule {
  /**
   * @publicApi
   */
  static async registerWhen(
    module: Required<ModuleMetadata>['imports'][number],
    condition: string | ((env: NodeJS.ProcessEnv) => boolean),
    options?: { timeout?: number; debug?: boolean },
  ) {
    const { timeout = 5000, debug = true } = options ?? {};
    const moduleName = getInstanceName(module) || module.toString();

    const timer = setTimeout(() => {
      throw new Error(
        `Nest was not able to resolve the config variables within ${timeout} milliseconds. Bause of this, the ConditionalModule was not able to determine if ${moduleName} should be registered or not`,
      );
    }, timeout);
    timer.unref();

    const returnModule: Required<
      Pick<DynamicModule, 'module' | 'imports' | 'exports'>
    > = { module: ConditionalModule, imports: [], exports: [] };
    if (typeof condition === 'string') {
      const key = condition;
      condition = env => {
        return env[key]?.toLowerCase() !== 'false';
      };
    }
    await ConfigModule.envVariablesLoaded;
    clearTimeout(timer);
    const evaluation = condition(process.env);
    if (evaluation) {
      returnModule.imports.push(module);
      returnModule.exports.push(module);
    } else {
      if (debug) {
        Logger.debug(
          `${condition.toString()} evaluated to false. Skipping the registration of ${moduleName}`,
          ConditionalModule.name,
        );
      }
    }
    return returnModule;
  }
}
