import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withExpandedEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded env variables`, () => {
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.EMAIL).toEqual('support@myapp.test');
  });

  afterEach(async () => {
    await app.close();
  });
});
