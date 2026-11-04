import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import Joi from 'joi';
import { tmpdir } from 'os';
import { join } from 'path';
import { setTimeout as delay } from 'timers/promises';
import {
  ConditionalModule,
  ConfigModule,
  ConfigService,
  registerAs,
} from '../../lib/index.js';

const JWT_SECRET = 'JWT_SECRET';

describe('Load order', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tmpDir: string;
  let envFilePath: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tmpDir = fs.mkdtempSync(join(tmpdir(), 'nestjs-config-'));
    envFilePath = join(tmpDir, '.env');
    fs.writeFileSync(
      envFilePath,
      ['JWT_SECRET=from-env-file', 'ENABLE_DEBUG=false'].join('\n'),
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const loadSecrets = async () => {
    await delay(20);
    return { JWT_SECRET: 'from-secret-store' };
  };

  it('should provide ConfigService to a plain "ConfigModule" import once async "load" factories are merged', async () => {
    @Module({
      imports: [ConfigModule],
      providers: [
        {
          provide: JWT_SECRET,
          useFactory: (configService: ConfigService) =>
            configService.get('JWT_SECRET'),
          inject: [ConfigService],
        },
      ],
      exports: [JWT_SECRET],
    })
    class AuthModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ envFilePath, load: [loadSecrets] }),
        AuthModule,
      ],
    }).compile();

    expect(moduleRef.get(JWT_SECRET)).toBe('from-secret-store');
  });

  it('should provide ConfigService of "forFeature" once its async factory is merged', async () => {
    const authConfig = registerAs('auth', async () => {
      await delay(20);
      return { secret: 'from-secret-store' };
    });

    @Injectable()
    class AuthService {
      readonly secret: string | undefined;
      constructor(@Inject(ConfigService) configService: ConfigService) {
        this.secret = configService.get('auth.secret');
      }
    }

    @Module({
      imports: [ConfigModule.forFeature(authConfig)],
      providers: [AuthService],
    })
    class AuthModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath }), AuthModule],
    }).compile();

    expect(moduleRef.get(AuthService).secret).toBe('from-secret-store');
  });

  it('should provide ConfigService to a plain "ConfigModule" import without "forRoot"', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    expect(moduleRef.get(ConfigService)).toBeInstanceOf(ConfigService);
  });

  it('should evaluate "registerWhen" after every "forRoot" has loaded its env file', async () => {
    @Injectable()
    class DebugService {}

    @Module({ providers: [DebugService], exports: [DebugService] })
    class DebugModule {}

    @Module({ imports: [ConfigModule.forRoot({ ignoreEnvFile: true })] })
    class LibraryModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConditionalModule.registerWhen(DebugModule, 'ENABLE_DEBUG', {
          debug: false,
        }),
        ConfigModule.forRoot({
          envFilePath,
          validationSchema: Joi.object({ ENABLE_DEBUG: Joi.boolean() }),
        }),
        LibraryModule,
      ],
    }).compile();

    expect(process.env.ENABLE_DEBUG).toBe('false');
    expect(() => moduleRef.get(DebugService)).toThrow();
  });
});
