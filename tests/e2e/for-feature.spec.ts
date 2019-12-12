import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('forFeature()', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withForFeature()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should load configuration with "forFeature()"`, () => {
    const host = app.get(AppModule).getDatabaseHost();
    expect(host).toEqual('host');
  });

  afterEach(async () => {
    await app.close();
  });
});
