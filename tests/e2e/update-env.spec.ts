import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../lib';
import { AppModule } from '../src/app.module';
import { ConfigService } from '../../lib';

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

    module.get(ConfigService).set('URL', 'yourapp.test');

    const updatedUrl = module.get(ConfigService).get('URL');
    const updatedEmail = module.get(ConfigService).get('EMAIL');

    expect(prevUrl).toEqual('myapp.test');
    expect(prevEmail).toEqual('support@myapp.test');
    expect(updatedUrl).toEqual('yourapp.test');
    expect(updatedEmail).toEqual('support@yourapp.test');
  });

  it(`should return updated process.env property after set`, async () => {
    await ConfigModule.envVariablesLoaded;

    module.get(ConfigService).set('URL', 'yourapp.test');

    const envVars = app.get(AppModule).getEnvVariables();

    expect(envVars.URL).toEqual('yourapp.test');
    expect(envVars.EMAIL).toEqual('support@yourapp.test');
  });

  afterEach(async () => {
    process.env = originalEnv;
    await app.close();
  });
});
