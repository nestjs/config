import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Joi from 'joi';
import {
  ConfigModule,
  ConfigModuleOptions,
  ConfigService,
} from '../../lib/index.js';
import { AppModule } from '../src/app.module.js';

const variants: { name: string; options: ConfigModuleOptions }[] = [
  { name: 'cache', options: { cache: true } },
  { name: 'validate', options: { validate: config => config } },
  {
    name: 'validationSchema',
    options: { validationSchema: Joi.object({ URL: Joi.string() }) },
  },
];

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
    expect(updatedDeep).toEqual('host=yourapp.test:8080/path');
    // Ensure FALLBACK (${URL:-fallback}) is not mangled into yourapp.test:-fallback}
    expect(updatedFallback).toEqual('yourapp.test');
  });

  it(`should return updated process.env property after set`, async () => {
    await ConfigModule.envVariablesLoaded;

    module.get(ConfigService).set('URL', 'yourapp.test');

    const envVars = app.get(AppModule).getEnvVariables();

    expect(envVars.URL).toEqual('yourapp.test');
    expect(envVars.EMAIL).toEqual('support@yourapp.test');
    expect(envVars.SUPPORT_URL).toEqual('https://yourapp.test/help');
    expect(envVars.URL_PORT).toEqual('yourapp.test:8080');
    expect(envVars.DEEP).toEqual('host=yourapp.test:8080/path');
    expect(envVars.FALLBACK).toEqual('yourapp.test');
  });

  it('should expand all references of dependent variable after set', async () => {
    module.get(ConfigService).set('URL', 'yourapp.test');
    expect(module.get(ConfigService).get('API_URL')).toEqual(
      'http://yourapp.test:3000/api',
    );

    module.get(ConfigService).set('API_PORT', '4000');
    expect(module.get(ConfigService).get('API_URL')).toEqual(
      'http://yourapp.test:4000/api',
    );
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

describe('Setting environment variables with module options', () => {
  let app: INestApplication;
  let originalEnv: NodeJS.ProcessEnv;

  const createConfigService = async (options: ConfigModuleOptions) => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withExpandedEnvVars(options)],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    return app.get(ConfigService);
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  describe.each(variants)('$name', ({ options }) => {
    it('should return updated value with interpolation after set', async () => {
      const configService = await createConfigService(options);
      expect(configService.get('EMAIL')).toEqual('support@myapp.test');
      expect(configService.get('URL_PORT')).toEqual('myapp.test:8080');
      expect(configService.get('DEEP')).toEqual('host=myapp.test:8080/path');

      configService.set('URL', 'yourapp.test');

      expect(configService.get('EMAIL')).toEqual('support@yourapp.test');
      expect(configService.get('URL_PORT')).toEqual('yourapp.test:8080');
      expect(configService.get('DEEP')).toEqual('host=yourapp.test:8080/path');
    });
  });

  it('should not overwrite variable that was set before env file was loaded', async () => {
    process.env.EMAIL = 'shell@myapp.test';
    // same raw value as in env file (e.g. dotenv/config preloaded) is expanded
    process.env.URL_PORT = '${URL}:8080';
    // empty value counts as not set, as in dotenv-expand
    process.env.SUPPORT_URL = '';
    const configService = await createConfigService({});

    configService.set('URL', 'yourapp.test');

    expect(configService.get('EMAIL')).toEqual('shell@myapp.test');
    expect(configService.get('URL_PORT')).toEqual('yourapp.test:8080');
    expect(configService.get('SUPPORT_URL')).toEqual(
      'https://yourapp.test/help',
    );
  });

  it('should not expand variables on set when expandVariables is disabled', async () => {
    const configService = await createConfigService({ expandVariables: false });
    expect(configService.get('EMAIL')).toEqual('support@${URL}');

    configService.set('URL', 'yourapp.test');

    expect(configService.get('EMAIL')).toEqual('support@${URL}');
  });

  it('should not read env file on set when ignoreEnvFile is enabled', async () => {
    const configService = await createConfigService({ ignoreEnvFile: true });

    configService.set('URL', 'yourapp.test');

    expect(configService.get('EMAIL')).toBeUndefined();
  });

  it('should not throw on set when validate returns a frozen object', async () => {
    const configService = await createConfigService({
      validate: config => Object.freeze({ ...config }),
    });

    expect(() => configService.set('URL', 'yourapp.test')).not.toThrow();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await app.close();
  });
});
