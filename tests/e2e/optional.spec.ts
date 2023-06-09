import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ConfigService } from '../../lib';

describe('Optional environment variables', () => {
  it('should return undefined for optional variables', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withValidateFunction(() => ({
        optional: undefined,
      }))],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const optional = module.get(ConfigService).get('optional')

    expect(optional).toEqual(undefined)
  });

  it('should not assign complex objects back to process.env', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withValidateFunction(() => ({
        complex: {hello: 'there'},
      }))],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    expect(process.env.complex).toEqual(undefined)
  });
});
