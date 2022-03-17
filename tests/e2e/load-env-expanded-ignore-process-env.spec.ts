import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.URL = 'process-app.test';

    const module = await Test.createTestingModule({
      imports: [AppModule.withExpandedEnvVarsIgnoreProcessEnv()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should ignore process environment variable`, () => {
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.EMAIL).toEqual('support@myapp.test');
  });

  afterEach(async () => {
    process.env.URL = undefined
    await app.close();
  });
});
