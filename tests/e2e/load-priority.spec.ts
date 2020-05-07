import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Environment variables and .env files', () => {
  let app: INestApplication;
  let envBackup: NodeJS.ProcessEnv;
  beforeAll(() => {
    envBackup = process.env;
  });
  describe('without conflicts', () => {
    beforeAll(async () => {
      process.env['NAME'] = 'TEST';
      const module = await Test.createTestingModule({
        imports: [AppModule.withEnvVars()],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it(`should return loaded env variables from vars and dotenv`, () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual('4000');
      expect(configService.get('NAME')).toEqual('TEST');
    });
  });

  describe('with conflicts', () => {
    beforeAll(async () => {
      process.env['PORT'] = '8000';
      const module = await Test.createTestingModule({
        imports: [AppModule.withEnvVars()],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should choose dotenv over env vars', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual('4000');
    });
  });

  describe('with conflicts and schema validation', () => {
    beforeAll(async () => {
      process.env['PORT'] = '8000';
      const module = await Test.createTestingModule({
        imports: [
          AppModule.withSchemaValidation(join(__dirname, '.env.valid')),
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should choose dotenv over env vars', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual(4000);
    });
  });

  afterEach(async () => {
    process.env = envBackup;
    await app.close();
  });
});
