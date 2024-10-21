import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Async Files', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withLoadedAsyncConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded configuration`, () => {
    const host = app.get(AppModule).getDatabaseHost();
    expect(host).toEqual('host');
  });

  it(`should return loaded configuration (injected through constructor)`, () => {
    const config = app.get(AppModule).getDatabaseConfig();
    expect(config.host).toEqual('host');
    expect(config.port).toEqual(4000);
  });

  afterEach(async () => {
    await app.close();
  });
});
