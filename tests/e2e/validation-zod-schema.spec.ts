import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fileURLToPath } from 'node:url';
import { ConfigService } from '../../lib/index.js';
import { AppModule } from '../src/app.module.js';

const envValidFilePath = fileURLToPath(new URL('.env.valid', import.meta.url));
const envExtraFilePath = fileURLToPath(new URL('.env.extra', import.meta.url));

const variants = [
  { name: 'Zod v3', withValidation: AppModule.withZodV3SchemaValidation },
  { name: 'Zod v4', withValidation: AppModule.withZodV4SchemaValidation },
  {
    name: 'Zod v4 mini',
    withValidation: AppModule.withZodV4MiniSchemaValidation,
  },
];

describe('Zod schema validation', () => {
  let app: INestApplication;
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.PORT;
    delete process.env.DATABASE_NAME;
    delete process.env.FEATURE_FLAG;
  });

  afterEach(async () => {
    process.env = { ...envBackup };
    await app?.close();
    app = undefined as unknown as INestApplication;
  });

  describe.each(variants)('$name', ({ withValidation }) => {
    it(`should validate loaded env variables`, async () => {
      await expect(
        Test.createTestingModule({
          imports: [withValidation()],
        }).compile(),
      ).rejects.toThrow(/^Config validation error: [\s\S]*PORT/);
    });

    it(`should report an issue for every invalid variable`, async () => {
      await expect(
        Test.createTestingModule({
          imports: [withValidation()],
        }).compile(),
      ).rejects.toThrow(/PORT[\s\S]*DATABASE_NAME/);
    });

    it(`should validate env variables even when ignoreEnvFile is true`, async () => {
      await expect(
        Test.createTestingModule({
          imports: [withValidation(undefined, true)],
        }).compile(),
      ).rejects.toThrow(/^Config validation error: [\s\S]*DATABASE_NAME/);
    });

    it(`should parse loaded env variables`, async () => {
      const module = await Test.createTestingModule({
        imports: [withValidation(envValidFilePath)],
      }).compile();

      app = module.createNestApplication();
      await app.init();

      const configService = app.get(ConfigService);
      expect(typeof configService.get('PORT')).toEqual('number');
      expect(typeof configService.get('DATABASE_NAME')).toEqual('string');
    });

    it(`should keep env variables that the schema does not declare`, async () => {
      const module = await Test.createTestingModule({
        imports: [withValidation(envExtraFilePath)],
      }).compile();

      app = module.createNestApplication();
      await app.init();

      // Zod object schemas strip undeclared keys, but variables loaded from the
      // env file must still reach process.env and ConfigService.
      expect(process.env.FEATURE_FLAG).toEqual('enabled');
      expect(app.get(ConfigService).get('FEATURE_FLAG')).toEqual('enabled');
    });
  });
});
