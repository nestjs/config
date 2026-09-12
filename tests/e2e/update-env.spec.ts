import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '../../lib/index.js';
import { AppModule } from '../src/app.module.js';

describe('Setting environment variables', () => {
  let app: INestApplication;
  let module: TestingModule;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };

    module = await Test.createTestingModule({
      imports: [AppModule.withExpandedEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should return updated value after set', async () => {
    const prevUrl = module.get(ConfigService).get('URL');

    module.get(ConfigService).set('URL', 'yourapp.test');

    const updatedUrl = module.get(ConfigService).get('URL');

    expect(prevUrl).toEqual('myapp.test');
    expect(updatedUrl).toEqual('yourapp.test');
  });

  it('should return value after set', async () => {
    const undefinedEnv = module.get(ConfigService).get('UNDEFINED_ENV');

    module.get(ConfigService).set('UNDEFINED_ENV', 'defined');

    const definedEnv = module.get(ConfigService).get('UNDEFINED_ENV');

    expect(undefinedEnv).toEqual(undefined);
    expect(definedEnv).toEqual('defined');
  });

  it('should return updated value with interpolation after set', async () => {
    const prevUrl = module.get(ConfigService).get('URL');
    const prevEmail = module.get(ConfigService).get('EMAIL');
    const prevSupportUrl = module.get(ConfigService).get('SUPPORT_URL');
    const prevUrlPort = module.get(ConfigService).get('URL_PORT');

    module.get(ConfigService).set('URL', 'yourapp.test');

    const updatedUrl = module.get(ConfigService).get('URL');
    const updatedEmail = module.get(ConfigService).get('EMAIL');
    const updatedSupportUrl = module.get(ConfigService).get('SUPPORT_URL');
    const updatedUrlPort = module.get(ConfigService).get('URL_PORT');

    expect(prevUrl).toEqual('myapp.test');
    expect(prevEmail).toEqual('support@myapp.test');
    expect(prevSupportUrl).toEqual('https://myapp.test/help');
    expect(prevUrlPort).toEqual('myapp.test:8080');

    expect(updatedUrl).toEqual('yourapp.test');
    expect(updatedEmail).toEqual('support@yourapp.test');
    expect(updatedSupportUrl).toEqual('https://yourapp.test/help');
    // Ensure URL_PORT was not corrupted by partial prefix replacement
    expect(updatedUrlPort).toEqual('myapp.test:8080');
  });

  it(`should return updated process.env property after set`, async () => {
    await ConfigModule.envVariablesLoaded;

    module.get(ConfigService).set('URL', 'yourapp.test');

    const envVars = app.get(AppModule).getEnvVariables();

    expect(envVars.URL).toEqual('yourapp.test');
    expect(envVars.EMAIL).toEqual('support@yourapp.test');
    expect(envVars.SUPPORT_URL).toEqual('https://yourapp.test/help');
    expect(envVars.URL_PORT).toEqual('myapp.test:8080');
  });

  afterEach(async () => {
    process.env = originalEnv;
    await app.close();
  });
});
