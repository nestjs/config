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
    envBackup = {
      ...process.env,
    };
    process.env = {}
  });

  it(`should validate loaded env variables`, async () => {
    try {
      const module = await Test.createTestingModule({
        imports: [AppModule.withSchemaValidation()],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    } catch (err) {
      expect(err.message).toEqual(
        'Config validation error: ' +
        JSON.stringify(
          [
            {
              message: '"PORT" is required',
              path: ['PORT'],
            },
            {
              message: '"DATABASE_NAME" is required',
              path: ['DATABASE_NAME'],
            },
          ],
          null,
          2,
        ),
      );
    }
  });

  it(`should validate env variables even when ignoreEnvFile is true`, async () => {
    try {
      const module = await Test.createTestingModule({
        imports: [AppModule.withSchemaValidation(undefined, true)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    } catch (err) {
      expect(err.message).toEqual(
        'Config validation error: ' +
        JSON.stringify(
          [
            {
              message: '"PORT" is required',
              path: ['PORT'],
            },
            {
              message: '"DATABASE_NAME" is required',
              path: ['DATABASE_NAME'],
            },
          ],
          null,
          2,
        ),
      );
    }
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

  afterEach(async () => {
    process.env = {
      ...envBackup,
    };
    await app?.close();
  });
});