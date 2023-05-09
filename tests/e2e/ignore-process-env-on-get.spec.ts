import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Ignore Env Varibles on get', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.URL = 'process-app.test';
    process.env.VAR_NAME = 'VAR_VALUE';

    const module = await Test.createTestingModule({
      imports: [AppModule.withIgnoreEnvVarsOnGet()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should not return env variable value`, () => {
    const configService = app.get(ConfigService);
    expect(configService.get<string>('VAR_NAME')).toEqual(undefined);
  });

  
  it(`should return variable from load instead of env`, () => {
    const configService = app.get(ConfigService);
    expect(configService.get<string>('URL')).toEqual('override-from-load');
  });

  afterEach(async () => {
    process.env.URL = undefined
    process.env.VAR_NAME = undefined;
    await app.close();
  });
});
