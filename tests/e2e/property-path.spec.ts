import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod/v4';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
  registerAs,
} from '../../lib/index.js';

describe('Property paths', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tmpDir: string;

  async function createConfigService(options: ConfigModuleOptions) {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, ...options })],
    }).compile();
    return moduleRef.get(ConfigService);
  }

  beforeEach(() => {
    originalEnv = { ...process.env };
    tmpDir = fs.mkdtempSync(join(tmpdir(), 'nestjs-config-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    // Undo a write to a built-in, so that it doesn't break later tests
    delete (Object.prototype.hasOwnProperty as any).call;
    delete (Object.prototype.toString as any).call;
  });

  it('should not write to members inherited from built-in prototypes', async () => {
    const configService = await createConfigService({
      load: [registerAs('flags', () => ({ beta: 'off' }))],
    });

    configService.set('flags.beta', 'on');
    configService.set('flags.hasOwnProperty.call', 'on');
    configService.set('flags.toString.call', 'on');

    expect(
      Object.getOwnPropertyDescriptor(Object.prototype.hasOwnProperty, 'call'),
    ).toBeUndefined();
    expect(
      Object.getOwnPropertyDescriptor(Object.prototype.toString, 'call'),
    ).toBeUndefined();
    expect(configService.get('flags.beta')).toBe('on');
    expect(configService.get('flags.hasOwnProperty.call')).toBe('on');
  });

  it('should ignore paths through "__proto__", "constructor" or "prototype"', async () => {
    const configService = await createConfigService({
      load: [registerAs('flags', () => ({ beta: 'off' }))],
    });

    configService.set('flags.__proto__.polluted', 'yes');
    configService.set('flags.constructor.prototype.polluted', 'yes');

    expect(({} as any).polluted).toBeUndefined();
  });

  it('should not resolve members inherited from built-in prototypes', async () => {
    const configService = await createConfigService({
      load: [registerAs('features', () => ({ beta: true }))],
    });

    expect(configService.get('constructor.prototype')).toBeUndefined();
    expect(configService.get('features.constructor')).toBeUndefined();
    expect(configService.get('features.toString', 'default')).toBe('default');
    expect(() => configService.getOrThrow('features.hasOwnProperty')).toThrow(
      TypeError,
    );
    expect(configService.get('features.beta')).toBe(true);
  });

  it('should resolve members of class instances', async () => {
    class DatabaseConfig {
      host = 'localhost';
      get url() {
        return `postgres://${this.host}`;
      }
    }
    const configService = await createConfigService({
      load: [registerAs('database', () => new DatabaseConfig() as any)],
    });

    expect(configService.get('database.host')).toBe('localhost');
    expect(configService.get('database.url')).toBe('postgres://localhost');
  });

  it('should not let a dotted lookup change a cached value', async () => {
    process.env.FEATURE_REQUIRE_MFA = 'true';
    const configService = await createConfigService({ cache: true });

    expect(configService.get('FEATURE_REQUIRE_MFA.toString')).toBeUndefined();
    expect(configService.get('FEATURE_REQUIRE_MFA')).toBe('true');
    expect(configService.get('FEATURE_REQUIRE_MFA.length')).toBe(4);
    expect(configService.get('FEATURE_REQUIRE_MFA')).toBe('true');
  });

  it('should treat dotted env file variables as names, not paths', async () => {
    const envFilePath = join(tmpDir, '.env');
    fs.writeFileSync(
      envFilePath,
      [
        'APP_URL=app.test',
        'JWT_SECRET.0=${APP_URL}',
        'toString.call=${APP_URL}',
      ].join('\n'),
    );
    process.env.JWT_SECRET = 'pinned';
    const configService = await createConfigService({
      ignoreEnvFile: false,
      envFilePath,
      expandVariables: true,
      cache: true,
      validate: config => ({
        APP_URL: config.APP_URL,
        JWT_SECRET: config.JWT_SECRET,
      }),
    });

    configService.set('APP_URL', 'other.test');

    expect(configService.get('JWT_SECRET')).toBe('pinned');
    expect(
      Object.getOwnPropertyDescriptor(Object.prototype.toString, 'call'),
    ).toBeUndefined();
    expect(process.env['toString.call']).toBe('other.test');
  });

  it('should not serve the validated environment as a configuration value', async () => {
    process.env.SOME_SECRET = 'secret';
    const configService = await createConfigService({
      validationSchema: z.object({ PORT: z.string().optional() }),
    });

    expect(configService.get('_PROCESS_ENV_VALIDATED')).toBeUndefined();
    expect(
      configService.get('_PROCESS_ENV_VALIDATED.SOME_SECRET'),
    ).toBeUndefined();
  });
});
