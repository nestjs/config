import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Class validation', () => {
  let app: INestApplication;

  it(`should validate loaded env variables`, async () => {
    try {
      const module = await Test.createTestingModule({
        imports: [AppModule.withClassValidation()],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    } catch (err) {
      expect(err.message).toEqual(
        'Config validation error:' +
          [
            ' ',
            'PORT: PORT must not be greater than 6666',
            'PORT: PORT must not be less than 1',
            'PORT: PORT must be a number conforming to the specified constraints',
            'DATABASE_NAME: DATABASE_NAME must be a string',
          ].join('\n -> '),
      );
    }
  });

  it(`should validate env variables even when ignoreEnvFile is true`, async () => {
    try {
      const module = await Test.createTestingModule({
        imports: [AppModule.withClassValidation(undefined, true)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    } catch (err) {
      expect(err.message).toEqual(
        'Config validation error:' +
          [
            ' ',
            'PORT: PORT must not be greater than 6666',
            'PORT: PORT must not be less than 1',
            'PORT: PORT must be a number conforming to the specified constraints',
            'DATABASE_NAME: DATABASE_NAME must be a string',
          ].join('\n -> '),
      );
    }
  });

  it(`should parse loaded env variables`, async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withClassValidation(join(__dirname, '.env.valid'))],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    const configService = app.get(ConfigService);
    expect(typeof configService.get('PORT')).toEqual('number');
  });
});
