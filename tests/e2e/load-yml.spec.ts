import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withYmlConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded http.port from yaml`, () => {
    const ymlVars = app.get(AppModule).getEnvVariables();
    expect(ymlVars['http.port']).toEqual('3000');
  });

  it(`should return loaded admin.port from yaml`, () => {
    const ymlVars = app.get(AppModule).getEnvVariables();
    expect(ymlVars['admin.port']).toEqual('9876');
  });

  it(`should return loaded admin.database port from yaml`, () => {
    const ymlVars = app.get(AppModule).getEnvVariables();
    expect(ymlVars['admin.database.port']).toEqual('5800');
  });

  afterEach(async () => {
    await app.close();
  });
});
