import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Schema validation', () => {
  let app: INestApplication;

  it(`should validate loaded env variables`, async () => {
    try {
      const module = await Test.createTestingModule({
        imports: [AppModule.withSchemaValidation()],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    } catch (err) {
      expect(err.message).toEqual(
        'Config validation error: "PORT" is required',
      );
    }
  });
});
