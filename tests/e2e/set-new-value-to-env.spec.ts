import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Set a new value', () => {
    let app: INestApplication;
    let moduleRef: TestingModule;
    let envBackup: NodeJS.ProcessEnv;
    beforeAll(() => {
        envBackup = process.env;
    });

    describe('without cache', () => {
        beforeAll(async () => {
            moduleRef = await Test.createTestingModule({
                imports: [AppModule.withEnvVars()],
            }).compile();

            app = moduleRef.createNestApplication();
            await app.init();
        });

        it(`should set the new value`, () => {
            const configService = app.get(ConfigService);

            configService.set('PORT', '2000')

            const newValue = configService.get('PORT')

            expect(newValue).toEqual("2000")
        });
    })

    describe('with cache', () => {
        beforeAll(async () => {
            const moduleRef = await Test.createTestingModule({
                imports: [AppModule.withCache()],
            }).compile();

            app = moduleRef.createNestApplication();
            await app.init();
        });

        it(`should not change the value`, () => {
            const configService = app.get(ConfigService);
            configService.set("PORT", "2000")

            expect(configService.get("PORT", "4000"))
        });

    })

    afterEach(async () => {
        await app.close();
    });
});
