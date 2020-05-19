import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ConfigService } from '../../lib';

describe('Optional Generic()', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule.withEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should allow a key of the interface`, () => {
    const configService = module.get<ConfigService<{ PORT: string }>>(
      ConfigService,
    );

    const port = configService.get('PORT');

    expect(port).toBeTruthy();
  });

  it(`should allow any key without a generic`, () => {
    const configService = module.get<ConfigService>(ConfigService);

    const port = configService.get('PORT');

    expect(port).toBeTruthy();
  });

  afterEach(async () => {
    await app.close();
  });
});
