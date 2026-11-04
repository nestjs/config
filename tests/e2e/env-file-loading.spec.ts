import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
} from '../../lib/index.js';

describe('Loading env files', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tmpDir: string;

  function writeEnvFile(name: string, content: string | Buffer) {
    const envFilePath = join(tmpDir, name);
    fs.writeFileSync(envFilePath, content);
    return envFilePath;
  }

  async function createConfigService(options: ConfigModuleOptions) {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(options)],
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
  });

  it('should assign expanded variables to process.env only after validation', async () => {
    const envFilePath = writeEnvFile(
      '.env',
      ['MAX_UPLOAD_MB=100000', 'ADMIN_BYPASS=1'].join('\n'),
    );
    const configService = await createConfigService({
      envFilePath,
      expandVariables: true,
      validate: config => ({
        MAX_UPLOAD_MB: Math.min(Number(config.MAX_UPLOAD_MB), 100),
      }),
    });

    expect(process.env.MAX_UPLOAD_MB).toBe('100');
    expect(configService.get('MAX_UPLOAD_MB')).toBe(100);
    expect(process.env.ADMIN_BYPASS).toBeUndefined();
    expect(configService.get('ADMIN_BYPASS')).toBeUndefined();
  });

  it('should replace an empty predefined variable with the expanded value', async () => {
    process.env.EMPTY_VAR = '';
    const envFilePath = writeEnvFile(
      '.env',
      ['HOST=myapp.test', 'EMPTY_VAR=${HOST}'].join('\n'),
    );
    const configService = await createConfigService({
      envFilePath,
      expandVariables: true,
    });

    expect(process.env.EMPTY_VAR).toBe('myapp.test');
    expect(configService.get('EMPTY_VAR')).toBe('myapp.test');
  });

  it('should expand variables of multiple env files once', async () => {
    process.env.DB_PASSWORD = 'p$ssw0rd';
    const appEnvFilePath = writeEnvFile(
      '.env.app',
      ['SESSION_SECRET=pa\\$word', 'DB_PASSWORD=from-file'].join('\n'),
    );
    const sharedEnvFilePath = writeEnvFile(
      '.env.shared',
      ['word=INJECTED', 'ssw0rd=EVIL'].join('\n'),
    );
    const configService = await createConfigService({
      envFilePath: [appEnvFilePath, sharedEnvFilePath],
      expandVariables: true,
    });

    expect(configService.get('SESSION_SECRET')).toBe('pa$word');
    expect(configService.get('DB_PASSWORD')).toBe('p$ssw0rd');
    expect(process.env.DB_PASSWORD).toBe('p$ssw0rd');
  });

  it('should reject a value that contains a NUL character', async () => {
    const envFilePath = writeEnvFile(
      '.env',
      Buffer.from('CALLBACK_URL=https://evil.example\0.trusted.example\n'),
    );

    await expect(
      ConfigModule.forRoot({ envFilePath, validate: config => config }),
    ).rejects.toThrow('Environment variable "CALLBACK_URL"');
    expect(process.env.CALLBACK_URL).toBeUndefined();
  });

  it('should ignore "__proto__" returned by a custom parser', async () => {
    const generatedEnvFilePath = writeEnvFile(
      'generated.json',
      '{"__proto__": {"INJECTED": "yes"}, "A": "1"}',
    );
    const defaultsEnvFilePath = writeEnvFile('defaults.json', '{"B": "2"}');
    const configService = await createConfigService({
      envFilePath: [generatedEnvFilePath, defaultsEnvFilePath],
      parser: buffer => JSON.parse(buffer.toString()),
      validatePredefined: false,
      validate: config => {
        const allowed = ['A', 'B'];
        if (Object.keys(config).some(key => !allowed.includes(key))) {
          throw new Error('Unexpected variable');
        }
        return config;
      },
    });

    expect(configService.get('A')).toBe('1');
    expect(configService.get('B')).toBe('2');
    expect(configService.get('INJECTED')).toBeUndefined();
  });
});
