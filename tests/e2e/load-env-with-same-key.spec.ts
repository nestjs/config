import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withLoadedSameKeyConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded env variables`, () => {
    const port = app.get(AppModule).getPortInSameKeyConfig();
    expect(port).toEqual(3000);
  });

  afterEach(async () => {
    await app.close();
  });
});
