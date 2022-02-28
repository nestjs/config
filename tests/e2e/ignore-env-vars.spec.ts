import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Ignore environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withIgnoredEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should prioritize custom config value over environment's value`, () => {
    const configService = app.get(ConfigService);
    expect(configService.get('PORT')).toEqual(4040);
  });

  afterEach(async () => {
    await app.close();
  });
});
