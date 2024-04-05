import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Environment variables and .env files', () => {
  let app: INestApplication;
  let envBackup: NodeJS.ProcessEnv;
  beforeAll(() => {
    envBackup = {
      ...process.env,
    };
  });
  describe('without conflicts', () => {
    beforeAll(async () => {
      process.env['NAME'] = 'TEST';
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.withEnvVars()],
      }).compile();

      app = moduleRef.createNestApplication();
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
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.withEnvVars()],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    it('should choose env vars over dotenv', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual('8000');
    });
  });

  describe('with conflicts and schema validation', () => {
    beforeAll(async () => {
      process.env['PORT'] = '8000';
      const moduleRef = await Test.createTestingModule({
        imports: [
          AppModule.withSchemaValidation(join(__dirname, '.env.valid')),
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    it('should choose env vars over dotenv', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual(8000);
    });
  });

  describe('with conflicts of .env file and loaded configuration', () => {
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AppModule.withEnvVarsAndLoadedConfigurations([
            () => ({ PORT: '8000' }),
          ]),
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    it('should choose .env file vars over load configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual('4000');
    });
  });

  describe('withAsyncLoadedConfigurations', () => {
    it('should load configurations asynchronously', async () => {
      // Mock the async loading of configuration factories
      const configFactoryPromise =  Promise.resolve(() => ({ PORT: '8000' }));
      
      // Create a testing module with AppModule configured to load configurations asynchronously
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.withAsyncLoadedConfigurations(configFactoryPromise)],
      }).compile();

      // Create the Nest application
      app = moduleRef.createNestApplication();
      await app.init();

      // Retrieve the ConfigService
      const configService = app.get(ConfigService);
      
      // Assert that the configurations are loaded correctly
      expect(configService.get('PORT')).toEqual('8000');
    });
  });

  describe('with conflicts of multiple loaded configurations', () => {
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AppModule.withDynamicLoadedConfigurations([
            () => ({ PORT: '8000' }),
            () => ({ PORT: '9000' }),
          ]),
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    it('should choose last load configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService.get('PORT')).toEqual('9000');
    });
  });

  afterEach(async () => {
    process.env = {
      ...envBackup,
    };
    await app.close();
  });
});
