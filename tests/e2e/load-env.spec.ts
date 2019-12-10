import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded env variables`, () => {
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.PORT).toEqual('4000');
  });

  it(`should inject env variable with @InjectConfig`, () => {
    const port = app.get(AppModule).getServerPort();
    expect(port).toEqual('4000');
  });

  afterEach(async () => {
    await app.close();
  });
});
