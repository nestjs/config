/**
 * Library-agnostic coverage for the Standard Schema contract itself, using
 * hand-written schemas that exercise shapes the mainstream libraries do not
 * produce on their own.
 * @see https://standardschema.dev/
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as v from 'valibot';
import { ConfigService } from '../../lib/index.js';
import { AppModule } from '../src/app.module.js';

function createSchema(
  validate: StandardSchemaV1['~standard']['validate'],
  vendor = 'test',
): StandardSchemaV1 {
  return { '~standard': { version: 1, vendor, validate } };
}

describe('Standard Schema validation', () => {
  let app: INestApplication;
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.PORT;
  });

  afterEach(async () => {
    process.env = { ...envBackup };
    await app?.close();
    app = undefined as unknown as INestApplication;
  });

  it(`should fail when issues are returned alongside a value`, async () => {
    // Valibot-style failure: the partially parsed dataset is returned together
    // with the issues, so the presence of "value" must not imply success.
    const schema = createSchema(() => ({
      value: { PORT: undefined },
      issues: [{ message: 'PORT is required', path: ['PORT'] }],
    }));

    await expect(
      Test.createTestingModule({
        imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
      }).compile(),
    ).rejects.toThrow('Config validation error: PORT: PORT is required');
  });

  it(`should fail when a real valibot schema rejects the config`, async () => {
    const schema = v.object({ PORT: v.string() });

    await expect(
      Test.createTestingModule({
        imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
      }).compile(),
    ).rejects.toThrow('Config validation error: PORT:');
  });

  it(`should accept a config validated by a real valibot schema`, async () => {
    process.env.PORT = '4000';
    const schema = v.object({ PORT: v.string() });

    const module = await Test.createTestingModule({
      imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    expect(app.get(ConfigService).get('PORT')).toEqual('4000');
  });

  it(`should await schemas that validate asynchronously`, async () => {
    const schema = createSchema(async config => ({
      value: { ...(config as Record<string, any>), PORT: 4000 },
    }));

    const module = await Test.createTestingModule({
      imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    expect(app.get(ConfigService).get('PORT')).toEqual(4000);
  });

  it(`should report issues from schemas that validate asynchronously`, async () => {
    const schema = createSchema(async () => ({
      issues: [{ message: 'PORT is required', path: ['PORT'] }],
    }));

    await expect(
      Test.createTestingModule({
        imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
      }).compile(),
    ).rejects.toThrow('Config validation error: PORT: PORT is required');
  });

  it(`should format issue paths built from path segment objects`, async () => {
    const schema = createSchema(() => ({
      issues: [
        {
          message: 'must be a number',
          path: [{ key: 'DATABASE' }, { key: 'PORT' }],
        },
      ],
    }));

    await expect(
      Test.createTestingModule({
        imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
      }).compile(),
    ).rejects.toThrow('Config validation error: DATABASE.PORT: must be a number');
  });

  it(`should report issues that carry no path`, async () => {
    const schema = createSchema(() => ({
      issues: [{ message: 'the config is invalid' }],
    }));

    await expect(
      Test.createTestingModule({
        imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
      }).compile(),
    ).rejects.toThrow('Config validation error: the config is invalid');
  });

  it(`should forward validationOptions to the schema`, async () => {
    const validate = vi.fn<StandardSchemaV1['~standard']['validate']>(() => ({
      value: {},
    }));
    const schema = createSchema(validate);
    const validationOptions = { libraryOptions: { custom: true } };

    const module = await Test.createTestingModule({
      imports: [
        AppModule.withStandardSchemaValidation(
          schema,
          undefined,
          true,
          validationOptions,
        ),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    expect(validate.mock.calls[0][1]).toEqual(validationOptions);
  });

  it(`should not inject Joi defaults into other vendors' options`, async () => {
    const validate = vi.fn<StandardSchemaV1['~standard']['validate']>(() => ({
      value: {},
    }));
    const schema = createSchema(validate, 'zod');

    const module = await Test.createTestingModule({
      imports: [AppModule.withStandardSchemaValidation(schema, undefined, true)],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    expect(validate.mock.calls[0][1]).toBeUndefined();
  });
});
