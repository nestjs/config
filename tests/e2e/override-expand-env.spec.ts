import * as fs from 'fs';
import { Test } from '@nestjs/testing';
import { fileURLToPath } from 'node:url';
import { ConfigModule, ConfigService } from '../../lib/index.js';

describe('Environment variables override with expanded variables', () => {
  const envFilePath = fileURLToPath(
    new URL('.env.override-expand-test', import.meta.url),
  );

  beforeAll(() => {
    fs.writeFileSync(
      envFilePath,
      ['EXISTING_VAR=file_value', 'DERIVED_VAR=${EXISTING_VAR}_derived'].join(
        '\n',
      ),
    );
  });

  afterAll(() => {
    if (fs.existsSync(envFilePath)) {
      fs.unlinkSync(envFilePath);
    }
  });

  beforeEach(() => {
    process.env.EXISTING_VAR = 'process_value';
    delete process.env.DERIVED_VAR;
  });

  afterEach(() => {
    delete process.env.EXISTING_VAR;
    delete process.env.DERIVED_VAR;
  });

  it('should keep the process.env value when "override" is false', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          expandVariables: true,
          override: false,
        }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);

    expect(process.env.EXISTING_VAR).toBe('process_value');
    expect(process.env.DERIVED_VAR).toBe('process_value_derived');
    expect(configService.get('EXISTING_VAR')).toBe('process_value');
    expect(configService.get('DERIVED_VAR')).toBe('process_value_derived');
  });

  it('should use the .env file value when "override" is true', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          expandVariables: true,
          override: true,
        }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);

    expect(process.env.EXISTING_VAR).toBe('file_value');
    expect(process.env.DERIVED_VAR).toBe('file_value_derived');
    expect(configService.get('EXISTING_VAR')).toBe('file_value');
    expect(configService.get('DERIVED_VAR')).toBe('file_value_derived');
  });

  it('should still expand variables that only exist in process.env when "override" is true', async () => {
    process.env.ONLY_IN_PROCESS_ENV = 'from_process';
    const extraEnvFilePath = fileURLToPath(
      new URL('.env.override-expand-process-test', import.meta.url),
    );
    fs.writeFileSync(
      extraEnvFilePath,
      'FROM_PROCESS=${ONLY_IN_PROCESS_ENV}_expanded',
    );

    try {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            envFilePath: extraEnvFilePath,
            expandVariables: true,
            override: true,
          }),
        ],
      }).compile();
      const configService = moduleRef.get(ConfigService);

      expect(configService.get('FROM_PROCESS')).toBe('from_process_expanded');
    } finally {
      fs.unlinkSync(extraEnvFilePath);
      delete process.env.ONLY_IN_PROCESS_ENV;
      delete process.env.FROM_PROCESS;
    }
  });

  it('should write the expanded values to a custom "processEnv" target when "override" is true', async () => {
    const processEnv: Record<string, string> = {
      EXISTING_VAR: 'custom_value',
    };

    await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath,
          expandVariables: { processEnv },
          override: true,
        }),
      ],
    }).compile();

    expect(processEnv.EXISTING_VAR).toBe('file_value');
    expect(processEnv.DERIVED_VAR).toBe('file_value_derived');
  });
});
