import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Nested Files', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withNestedLoadedConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return nested loaded configuration`, () => {
    const host = app.get(AppModule).getNestedDatabaseHost();
    expect(host).toEqual('host');
  });

  afterEach(async () => {
    await app.close();
  });
});
