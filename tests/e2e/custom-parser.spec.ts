import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '../../lib';
import { AppModule } from '../src/app.module';
import { join } from 'path';

describe('Custom parser', () => {
  let app: INestApplication;

  it(`should use dotenv parser by default`, async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    await ConfigModule.envVariablesLoaded;

    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.PORT).toEqual('4000');
  });

  it(`should use custom parser when provided`, async () => {
    const module = await Test.createTestingModule({
      imports: [
        {
          module: AppModule,
          imports: [
            ConfigModule.forRoot({
              envFilePath: join(
                process.cwd(),
                'tests',
                'e2e',
                '.custom-config',
              ),
              parser: buffer =>
                JSON.parse(
                  Buffer.from(buffer.toString('utf-8'), 'base64').toString(
                    'utf-8',
                  ),
                ),
            }),
          ],
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const envVars = app.get(AppModule).getEnvVariables();
    expect(envVars.lorem).toEqual('ipsum');
  });

  afterEach(async () => {
    await app.close();
  });
});
