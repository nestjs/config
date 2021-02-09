import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Optional Generic()', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule.withEnvVars()],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`should allow a key of the interface`, () => {
    const configService = moduleRef.get<ConfigService<{ PORT: string }>>(
      ConfigService,
    );

    const port = configService.get('PORT');
    expect(port).toBeTruthy();
  });

  it(`should infer type from a dot notation`, () => {
    const configService = moduleRef.get<
      ConfigService<{ obj: { test: boolean } }>
    >(ConfigService);

    const obj = configService.get('obj', { inferDotNotation: true });
    const test = configService.get('obj.test', { inferDotNotation: true });
    expect(obj?.test).toBeUndefined();
    expect(test).toBeUndefined();
  });

  it(`should allow any key without a generic`, () => {
    const configService = moduleRef.get<ConfigService>(ConfigService);
    const port = configService.get('PORT');

    expect(port).toBeTruthy();
  });

  afterEach(async () => {
    await app.close();
  });
});
