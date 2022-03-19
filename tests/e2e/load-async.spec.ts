import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ConfigService } from '../../lib';

describe('Async', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withAsyncLoadedConfigurations()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });


  it(`should load configuration`, () => {
    const config = app.get(ConfigService);
    expect(config.get('subject')).toEqual('value5000');
    expect(config.get('subjectModified')).toEqual('value5000Modified');
  });

  afterEach(async () => {
    await app.close();
  });
});
