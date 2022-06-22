import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  process.env.DB_URL = 'protocol://${db_username}:${db_password}@127.0.0.1/test';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withExpandedEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded env variables`, () => {
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.DB_URL).toEqual('protocol://sa:AStrongPassword@127.0.0.1/test');
  });

  afterEach(async () => {
    await app.close();
  });
});
