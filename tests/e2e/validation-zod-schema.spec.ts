import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Zod Schema validation', () => {
  let app: INestApplication;

  describe('Zod schema v3 validation', () => {
    it(`should validate loaded env variables with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV3SchemaValidation()],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['PORT'],
            message: 'Required',
          },
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['DATABASE_NAME'],
            message: 'Required',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should validate env variables even when ignoreEnvFile is true with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV3SchemaValidation(undefined, true)],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['PORT'],
            message: 'Required',
          },
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['DATABASE_NAME'],
            message: 'Required',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should parse loaded env variables with Zod`, async () => {
      const module = await Test.createTestingModule({
        imports: [
          AppModule.withZodV3SchemaValidation(join(__dirname, '.env.valid')),
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();

      const configService = app.get(ConfigService);
      expect(typeof configService.get('PORT')).toEqual('number');
      expect(typeof configService.get('DATABASE_NAME')).toEqual('string');
    });
  });

  describe('Zod schema v4 validation', () => {
    it(`should validate loaded env variables with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV4SchemaValidation()],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['PORT'],
            message: 'Invalid input: expected string, received undefined',
          },
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['DATABASE_NAME'],
            message: 'Invalid input: expected string, received undefined',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should validate env variables even when ignoreEnvFile is true with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV4SchemaValidation(undefined, true)],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['PORT'],
            message: 'Invalid input: expected string, received undefined',
          },
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['DATABASE_NAME'],
            message: 'Invalid input: expected string, received undefined',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should parse loaded env variables with Zod`, async () => {
      const module = await Test.createTestingModule({
        imports: [
          AppModule.withZodV4SchemaValidation(join(__dirname, '.env.valid')),
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();

      const configService = app.get(ConfigService);
      expect(typeof configService.get('PORT')).toEqual('number');
      expect(typeof configService.get('DATABASE_NAME')).toEqual('string');
    });
  });

  describe('Zod schema v4 mini validation', () => {
    it(`should validate loaded env variables with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV4MiniSchemaValidation()],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            expected: 'number',
            code: 'invalid_type',
            received: 'NaN',
            path: ['PORT'],
            message: 'Invalid input: expected number, received NaN',
          },
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['DATABASE_NAME'],
            message: 'Invalid input: expected string, received undefined',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should validate env variables even when ignoreEnvFile is true with Zod`, async () => {
      try {
        const module = await Test.createTestingModule({
          imports: [AppModule.withZodV4MiniSchemaValidation(undefined, true)],
        }).compile();

        app = module.createNestApplication();
        await app.init();
      } catch (err) {
        const message = [
          {
            expected: 'number',
            code: 'invalid_type',
            received: 'NaN',
            path: ['PORT'],
            message: 'Invalid input: expected number, received NaN',
          },
          {
            expected: 'string',
            code: 'invalid_type',
            path: ['DATABASE_NAME'],
            message: 'Invalid input: expected string, received undefined',
          },
        ];
        expect(err.message).toEqual(
          'Config validation error: ' + JSON.stringify(message, null, 2),
        );
      }
    });

    it(`should parse loaded env variables with Zod`, async () => {
      const module = await Test.createTestingModule({
        imports: [
          AppModule.withZodV4MiniSchemaValidation(
            join(__dirname, '.env.valid'),
          ),
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();

      const configService = app.get(ConfigService);
      expect(typeof configService.get('PORT')).toEqual('number');
      expect(typeof configService.get('DATABASE_NAME')).toEqual('string');
    });
  });
});
