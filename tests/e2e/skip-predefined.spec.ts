import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Environment variables (skip predefined)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withSkipPredefined()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should ignore predefined environment variables`, async () => {
    process.env.RANDOM_PREDEFINED = 'test';
    await ConfigModule.envVariablesLoaded;

    const configService = app.get(ConfigService);
    expect(configService.get('RANDOM_PREDEFINED')).toBeUndefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
