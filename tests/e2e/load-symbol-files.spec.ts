import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Symbol Files', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withSymbolLoadedConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return symbol loaded configuration`, () => {
    const config = app.get(AppModule).getSymbolDatabaseConfig();
    expect(config.host).toEqual('host');
    expect(config.port).toEqual(4000);
  });

  afterEach(async () => {
    await app.close();
  });
});
