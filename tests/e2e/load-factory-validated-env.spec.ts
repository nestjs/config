import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Joi from 'joi';
import { z } from 'zod/v4';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
  registerAs,
} from '../../lib/index.js';

describe('Validated environment variables in load factories', () => {
  let originalEnv: NodeJS.ProcessEnv;

  async function loadFactoryEnv(options: ConfigModuleOptions) {
    let received: Record<string, any> | undefined;
    await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ...options,
          load: [
            registerAs('database', env => {
              received = env;
              return {};
            }),
          ],
        }),
      ],
    }).compile();
    return received;
  }

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.PORT = '4000';
    process.env.DEBUG = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be passed to the factory converted by a Joi schema', async () => {
    const env = await loadFactoryEnv({
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DEBUG: Joi.boolean().default(false),
      }),
    });
    expect(env?.PORT).toBe(4000);
    expect(env?.DEBUG).toBe(true);
  });

  it('should be passed to the factory converted by a Zod schema', async () => {
    const env = await loadFactoryEnv({
      validationSchema: z.object({
        PORT: z.coerce.number(),
        DEBUG: z.stringbool(),
      }),
    });
    expect(env?.PORT).toBe(4000);
    expect(env?.DEBUG).toBe(true);
  });

  it('should be passed to the factory converted by a validate function', async () => {
    const env = await loadFactoryEnv({
      validate: config => ({ ...config, PORT: Number(config.PORT) }),
    });
    expect(env?.PORT).toBe(4000);
  });

  it('should be process.env when nothing validates it', async () => {
    const env = await loadFactoryEnv({});
    expect(env?.PORT).toBe('4000');
  });

  it('should leave factories that take no argument working', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [registerAs('database', () => ({ port: process.env.PORT }))],
        }),
      ],
    }).compile();
    expect(moduleRef.get(ConfigService).get('database.port')).toBe('4000');
  });

  it('should be passed to an async factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: Joi.object({ PORT: Joi.number() }),
          load: [registerAs('database', async env => ({ port: env.PORT }))],
        }),
      ],
    }).compile();
    expect(moduleRef.get(ConfigService).get('database.port')).toBe(4000);
  });

  it('should be the one of its own forRoot() call', async () => {
    const received: Record<string, any>[] = [];
    const factory = (key: string) =>
      registerAs(key, env => {
        received.push(env);
        return {};
      });
    await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: Joi.object({ PORT: Joi.number() }),
          load: [factory('first')],
        }),
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: Joi.object({ PORT: Joi.string() }),
          load: [factory('second')],
        }),
      ],
    }).compile();
    expect(received.map(env => env.PORT)).toEqual(
      expect.arrayContaining([4000, '4000']),
    );
  });

  it('should not be passed to a forFeature() factory', async () => {
    let received: unknown = 'not called';
    await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        ConfigModule.forFeature(
          registerAs('feature', (env: unknown) => {
            received = env;
            return {};
          }),
        ),
      ],
    }).compile();
    expect(received).toBeUndefined();
  });

  it('should not be passed to an asProvider() factory', async () => {
    let received: unknown = 'not called';
    const feature = registerAs('feature', env => {
      received = env;
      return {};
    });
    const { imports, ...provider } = feature.asProvider();
    @Module({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), ...imports],
      providers: [{ provide: 'FEATURE', ...provider }],
    })
    class FeatureModule {}
    await Test.createTestingModule({ imports: [FeatureModule] }).compile();
    expect(received).toBeUndefined();
  });
});
