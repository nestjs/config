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
    const prevDeep = module.get(ConfigService).get('DEEP');
    const prevFallback = module.get(ConfigService).get('FALLBACK');

    module.get(ConfigService).set('URL', 'yourapp.test');

    const updatedUrl = module.get(ConfigService).get('URL');
    const updatedEmail = module.get(ConfigService).get('EMAIL');
    const updatedSupportUrl = module.get(ConfigService).get('SUPPORT_URL');
    const updatedUrlPort = module.get(ConfigService).get('URL_PORT');
    const updatedDeep = module.get(ConfigService).get('DEEP');
    const updatedFallback = module.get(ConfigService).get('FALLBACK');

    expect(prevUrl).toEqual('myapp.test');
    expect(prevEmail).toEqual('support@myapp.test');
    expect(prevSupportUrl).toEqual('https://myapp.test/help');
    expect(prevUrlPort).toEqual('myapp.test:8080');
    expect(prevDeep).toEqual('host=myapp.test:8080/path');
    expect(prevFallback).toEqual('myapp.test');

    expect(updatedUrl).toEqual('yourapp.test');
    expect(updatedEmail).toEqual('support@yourapp.test');
    expect(updatedSupportUrl).toEqual('https://yourapp.test/help');
    expect(updatedUrlPort).toEqual('yourapp.test:8080');
    // Ensure DEEP (referencing URL_PORT) is not corrupted by partial prefix replacement into host=yourapp.test_PORT}/path
    expect(updatedDeep).toEqual('host=myapp.test:8080/path');
    // Ensure FALLBACK (${URL:-fallback}) is not mangled into yourapp.test:-fallback}
    expect(updatedFallback).toEqual('myapp.test');
  });

  it(`should return updated process.env property after set`, async () => {
    await ConfigModule.envVariablesLoaded;

    module.get(ConfigService).set('URL', 'yourapp.test');

    const envVars = app.get(AppModule).getEnvVariables();

    expect(envVars.URL).toEqual('yourapp.test');
    expect(envVars.EMAIL).toEqual('support@yourapp.test');
    expect(envVars.SUPPORT_URL).toEqual('https://yourapp.test/help');
    expect(envVars.URL_PORT).toEqual('yourapp.test:8080');
    expect(envVars.DEEP).toEqual('host=myapp.test:8080/path');
    expect(envVars.FALLBACK).toEqual('myapp.test');
  });

  it('should safely handle special replacement patterns in new value', async () => {
    module.get(ConfigService).set('URL', 'pa$$word');
    expect(module.get(ConfigService).get('EMAIL')).toEqual('support@pa$$word');

    module.get(ConfigService).set('URL', 'x$&y');
    expect(module.get(ConfigService).get('EMAIL')).toEqual('support@x$&y');
  });

  afterEach(async () => {
    process.env = originalEnv;
    await app.close();
  });
});
