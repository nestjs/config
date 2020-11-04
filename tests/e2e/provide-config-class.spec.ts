import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { Config } from '../src/config';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withEnvAndClassOptions()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should provide an instance of loaded env variables`, () => {
    const config = app.get<Config>(Config);
    expect(config.port).toEqual('4000');
    expect(config.timeout).toEqual(5000);
  });

  afterEach(async () => {
    await app.close();
  });
});
