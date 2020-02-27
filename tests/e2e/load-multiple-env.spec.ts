import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables (multiple env files)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withMultipleEnvFiles()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded env variables`, () => {
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.PORT).toEqual('3000');
    expect(envVars.TIMEOUT).toEqual('5000');
  });

  afterEach(async () => {
    await app.close();
  });
});
