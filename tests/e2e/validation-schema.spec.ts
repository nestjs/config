import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fileURLToPath } from 'node:url';
import { ConfigService } from '../../lib/index.js';
import { AppModule } from '../src/app.module.js';

const envValidFilePath = fileURLToPath(new URL('.env.valid', import.meta.url));

describe('Schema validation', () => {
  let app: INestApplication;
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    // The rest of process.env is deliberately left in place: the schema only
    // declares these two variables, so the suite also covers the unrelated
    // variables (PATH, HOME, ...) that Joi must be told to allow.
    delete process.env.PORT;
    delete process.env.DATABASE_NAME;
  });

  afterEach(async () => {
    process.env = { ...envBackup };
    await app?.close();
    app = undefined as unknown as INestApplication;
  });

  it(`should validate loaded env variables`, async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule.withSchemaValidation()],
      }).compile(),
    ).rejects.toThrow(
      'Config validation error: PORT: "PORT" is required\n' +
        'DATABASE_NAME: "DATABASE_NAME" is required',
    );
  });

  it(`should validate env variables even when ignoreEnvFile is true`, async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule.withSchemaValidation(undefined, true)],
      }).compile(),
    ).rejects.toThrow(
      'Config validation error: PORT: "PORT" is required\n' +
        'DATABASE_NAME: "DATABASE_NAME" is required',
    );
  });

  it(`should report every issue instead of aborting on the first one`, async () => {
    await expect(
      Test.createTestingModule({
        imports: [AppModule.withSchemaValidation()],
      }).compile(),
    ).rejects.toThrow(/PORT[\s\S]*DATABASE_NAME/);
  });

  it(`should allow variables that are not declared in the schema`, async () => {
    process.env.UNRELATED_VARIABLE = 'unrelated';

    const module = await Test.createTestingModule({
      imports: [AppModule.withSchemaValidation(envValidFilePath)],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    const configService = app.get(ConfigService);
    expect(configService.get('UNRELATED_VARIABLE')).toEqual('unrelated');
  });

  it(`should let "allowUnknown" be disabled through validationOptions`, async () => {
    process.env.UNRELATED_VARIABLE = 'unrelated';

    await expect(
      Test.createTestingModule({
        imports: [
          AppModule.withSchemaValidation(envValidFilePath, false, {
            libraryOptions: { allowUnknown: false },
          }),
        ],
      }).compile(),
    ).rejects.toThrow('"UNRELATED_VARIABLE" is not allowed');
  });

  it(`should parse loaded env variables`, async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withSchemaValidation(envValidFilePath)],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    const configService = app.get(ConfigService);
    expect(typeof configService.get('PORT')).toEqual('number');
  });
});
