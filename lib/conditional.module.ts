import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from './config.module';

export class ConditionalModule {
  static async registerWhen(
    module: Required<ModuleMetadata>['imports'][number],
    condition: string | ((env: NodeJS.ProcessEnv) => boolean),
  ) {
    if (typeof condition === 'string') {
      const key = condition;
      condition = env => {
        return env[key]?.toLowerCase() !== 'false';
      };
    }
    await ConfigModule.envVariablesLoaded;
    return condition(process.env)
      ? {
          module: ConditionalModule,
          imports: [module],
          exports: [module],
        }
      : { module: ConditionalModule, imports: [] };
  }
}
