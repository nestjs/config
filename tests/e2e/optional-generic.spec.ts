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
    const configService =
      moduleRef.get<ConfigService<{ PORT: string }>>(ConfigService);
    const port = configService.get('PORT');
    expect(port).toBeTruthy();
  });

  it(`should infer type from a dot notation`, () => {
    const configService =
      moduleRef.get<ConfigService<{ obj: { test: boolean; test2?: boolean } }>>(
        ConfigService,
      );

    const obj = configService.get('obj', { infer: true });
    const test = configService.get('obj.test', { infer: true });
    const testWithDefaultValue = configService.get('obj.test2', true, {
      infer: true,
    });
    expect(obj?.test).toEqual('true');
    expect(test).toEqual('true');
    expect(testWithDefaultValue).toBeTruthy();
  });

  it(`should infer type from a dot notation (getOrThrow)`, () => {
    const configService =
      moduleRef.get<ConfigService<{ obj: { test: boolean; test2?: boolean } }>>(
        ConfigService,
      );

    const obj = configService.getOrThrow('obj', { infer: true });
    const test = configService.getOrThrow('obj.test', { infer: true });
    const testWithDefaultValue = configService.getOrThrow('obj.test2', true, {
      infer: true,
    });
    expect(obj?.test).toEqual('true');
    expect(test).toEqual('true');
    expect(testWithDefaultValue).toBeTruthy();
  });

  it(`should allow any key without a generic`, () => {
    const configService = moduleRef.get<ConfigService>(ConfigService);
    const port = configService.get('PORT');

    expect(port).toBeTruthy();
  });

  it(`should allow any key without a generic and with the default value`, () => {
    const configService = moduleRef.get(ConfigService);
    const port = configService.get('PORT2', 'default');

    expect(port).toEqual('default');
  });

  afterEach(async () => {
    await app.close();
  });
});
