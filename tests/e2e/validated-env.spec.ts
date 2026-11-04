import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import Joi from 'joi';
import { tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod/v4';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
} from '../../lib/index.js';

describe('Validated environment variables', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tmpDir: string;

  function writeEnvFile(name: string, lines: string[]) {
    const envFilePath = join(tmpDir, name);
    fs.writeFileSync(envFilePath, lines.join('\n'));
    return envFilePath;
  }

  async function createConfigService(...optionsList: ConfigModuleOptions[]) {
    const moduleRef = await Test.createTestingModule({
      imports: optionsList.map(options => ConfigModule.forRoot(options)),
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

  describe('a variable the validator maps to undefined', () => {
    it('should not be served from process.env', async () => {
      process.env.CORS_ORIGIN = '*';
      process.env.ADMIN_API_TOKEN = '';
      const configService = await createConfigService({
        ignoreEnvFile: true,
        validationSchema: z.object({
          CORS_ORIGIN: z.url().optional().catch(undefined),
          ADMIN_API_TOKEN: z.preprocess(
            value => (value === '' ? undefined : value),
            z.string().optional(),
          ),
        }),
      });

      expect(configService.get('CORS_ORIGIN')).toBeUndefined();
      expect(configService.get('ADMIN_API_TOKEN', 'disabled')).toBe('disabled');
      expect(() => configService.getOrThrow('ADMIN_API_TOKEN')).toThrow(
        TypeError,
      );
    });

    it('should still be served from process.env if the validator was not given it', async () => {
      process.env.PORT = '3000';
      const configService = await createConfigService({
        ignoreEnvFile: true,
        validatePredefined: false,
        validate: config => ({ PORT: config.PORT }),
      });

      expect(configService.get('PORT')).toBe('3000');
    });
  });

  it('should not restore a variable the schema strips', async () => {
    const envFilePath = writeEnvFile('.env', [
      'ALLOW_INSECURE_COOKIES=true',
      'PORT=3000',
      'UNDECLARED=1',
    ]);
    const configService = await createConfigService({
      envFilePath,
      validationSchema: Joi.object({
        ALLOW_INSECURE_COOKIES: Joi.boolean().strip(),
        PORT: Joi.number(),
      }),
    });

    expect(configService.get('ALLOW_INSECURE_COOKIES')).toBeUndefined();
    expect(process.env.ALLOW_INSECURE_COOKIES).toBeUndefined();
    expect(configService.get('PORT')).toBe(3000);
    expect(configService.get('UNDECLARED')).toBe('1');
  });

  it('should keep undeclared variables of a schema that strips them', async () => {
    const envFilePath = writeEnvFile('.env', ['PORT=3000', 'UNDECLARED=1']);
    const configService = await createConfigService({
      envFilePath,
      validationSchema: z.object({ PORT: z.coerce.number() }),
    });

    expect(configService.get('PORT')).toBe(3000);
    expect(configService.get('UNDECLARED')).toBe('1');
  });

  it.each([
    ['zod', z.object({ PORT: z.coerce.number() })],
    ['joi', Joi.object({ PORT: Joi.number() })],
  ])(
    'should not serve undeclared process.env variables with "skipProcessEnv" (%s)',
    async (_, validationSchema) => {
      process.env.CLOUD_SECRET_KEY = 'hunter2';
      process.env.PORT = '3000';
      const configService = await createConfigService({
        ignoreEnvFile: true,
        skipProcessEnv: true,
        validationSchema: validationSchema as StandardSchemaV1,
      });

      expect(configService.get('CLOUD_SECRET_KEY')).toBeUndefined();
      expect(configService.get('CLOUD_SECRET_KEY', 'none')).toBe('none');
      expect(configService.get('PORT')).toBe(3000);
    },
  );

  it('should keep the values converted by each validated "forRoot"', async () => {
    const appEnvFilePath = writeEnvFile('.env.app', [
      'PORT=4000',
      'DISABLE_AUTH=false',
    ]);
    const mailEnvFilePath = writeEnvFile('.env.mail', ['SMTP_PORT=25']);
    const configService = await createConfigService(
      {
        envFilePath: appEnvFilePath,
        validationSchema: z.object({
          PORT: z.coerce.number(),
          DISABLE_AUTH: z.enum(['true', 'false']).transform(v => v === 'true'),
        }),
      },
      {
        envFilePath: mailEnvFilePath,
        validationSchema: z.object({ SMTP_PORT: z.coerce.number() }),
      },
    );

    expect(configService.get('PORT')).toBe(4000);
    expect(configService.get('DISABLE_AUTH')).toBe(false);
    expect(configService.get('SMTP_PORT')).toBe(25);
  });

  it('should prefer predefined variables when they are not validated', async () => {
    process.env.AUTH_ISSUER_URL = 'https://login.corp.example';
    const envFilePath = writeEnvFile('.env', [
      'AUTH_ISSUER_URL=https://dev.example',
      'LOG_LEVEL=debug',
    ]);
    const configService = await createConfigService({
      envFilePath,
      validatePredefined: false,
      validationSchema: z.object({
        AUTH_ISSUER_URL: z.string(),
        LOG_LEVEL: z.string(),
      }),
    });

    expect(configService.get('AUTH_ISSUER_URL')).toBe(
      'https://login.corp.example',
    );
    expect(configService.get('LOG_LEVEL')).toBe('debug');
  });

  it('should serve the validated env file value with "skipProcessEnv" when predefined variables are not validated', async () => {
    process.env.NODE_ENV = 'production';
    const envFilePath = writeEnvFile('.env', ['NODE_ENV=development']);
    const configService = await createConfigService({
      envFilePath,
      skipProcessEnv: true,
      validatePredefined: false,
      validationSchema: z.object({ NODE_ENV: z.string() }),
    });

    expect(configService.get('NODE_ENV')).toBe('development');
  });

  it('should serve the members of a class instance returned by "validate"', async () => {
    process.env.PORT = '3000';
    class EnvironmentVariables {
      readonly #port: number;
      constructor(config: Record<string, any>) {
        this.#port = Number(config.PORT);
      }
      get PORT() {
        return this.#port;
      }
    }
    const configService = await createConfigService({
      ignoreEnvFile: true,
      validate: config => new EnvironmentVariables(config),
    });

    expect(configService.get('PORT')).toBe(3000);
  });

  it('should serve the converted value of a predefined variable that equals the env file value', async () => {
    process.env.PORT = '3000';
    const envFilePath = writeEnvFile('.env', ['PORT=3000']);
    const configService = await createConfigService({
      envFilePath,
      validatePredefined: false,
      validationSchema: z.object({ PORT: z.coerce.number() }),
    });

    expect(configService.get('PORT')).toBe(3000);
  });

  describe('async "validate" function', () => {
    it('should serve the variables it resolves with', async () => {
      process.env.PORT = '3000';
      const configService = await createConfigService({
        ignoreEnvFile: true,
        validate: async config => ({ ...config, PORT: Number(config.PORT) }),
      });

      expect(configService.get('PORT')).toBe(3000);
    });

    it('should prevent the application from bootstrapping when it rejects', async () => {
      process.env.PORT = 'abc';

      await expect(
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validate: async () => {
            throw new Error('PORT must be a number');
          },
        }),
      ).rejects.toThrow('PORT must be a number');
    });
  });

  describe('validation error', () => {
    const apiKey = 'deadbeefdeadbeefdeadbeefdeadbee';

    it('should not contain the value Joi rejects', async () => {
      process.env.API_KEY = apiKey;

      const result = ConfigModule.forRoot({
        ignoreEnvFile: true,
        validationSchema: Joi.object({
          API_KEY: Joi.string().pattern(/^[0-9a-f]{32}$/),
        }),
      });

      await expect(result).rejects.toThrow(
        'API_KEY: "API_KEY" fails to match the required pattern',
      );
      await expect(result).rejects.not.toThrow(apiKey);
    });

    it('should not contain the rejected value quoted by any schema library', async () => {
      process.env.API_KEY = apiKey;
      const validationSchema: StandardSchemaV1 = {
        '~standard': {
          version: 1,
          vendor: 'custom',
          validate: value => ({
            issues: [
              {
                message: `Invalid key "${(value as any).API_KEY}"`,
                path: ['API_KEY'],
              },
            ],
          }),
        },
      };

      await expect(
        ConfigModule.forRoot({ ignoreEnvFile: true, validationSchema }),
      ).rejects.toThrow(
        'Config validation error: API_KEY: Invalid key [redacted]',
      );
    });
  });
});
