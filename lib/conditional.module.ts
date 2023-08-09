import { DynamicModule, Logger, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from './config.module';

export class ConditionalModule {
  static async registerWhen(
    module: Required<ModuleMetadata>['imports'][number],
    condition: string | ((env: NodeJS.ProcessEnv) => boolean),
    options?: { timeout: number },
  ) {
    let configResolved = false;
    const { timeout = 5000 } = options ?? {};
    setTimeout(() => {
      if (!configResolved) {
        throw new Error(
          `Nest was not able to resolve the config variables within ${timeout} milliseconds. Bause of this, the ConditionalModule was not able to determine if ${module.toString()} should be registered or not`,
        );
      }
    }, timeout);
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
    configResolved = true;
    const evaluation = condition(process.env);
    if (evaluation) {
      returnModule.imports.push(module);
      returnModule.exports.push(module);
    } else {
      Logger.debug(
        `${condition.toString()} evaluated to false. Skipping the registration of ${module.toString()}`,
        ConditionalModule.name,
      );
    }
    return returnModule;
  }
}
