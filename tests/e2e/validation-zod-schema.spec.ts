import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { ConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Zod Schema validation', () => {
	let app: INestApplication;

	it(`should validate loaded env variables with Zod`, async () => {
		try {
			const module = await Test.createTestingModule({
				imports: [AppModule.withZodSchemaValidation()],
			}).compile();

			app = module.createNestApplication();
			await app.init();
		} catch (err) {
			const message = [{ "expected": "string", "code": "invalid_type", "path": ["PORT"], "message": "Invalid input: expected string, received undefined" }, { "expected": "string", "code": "invalid_type", "path": ["DATABASE_NAME"], "message": "Invalid input: expected string, received undefined" }]
			expect(err.message).toEqual(
				'Config validation error: ' + JSON.stringify(message, null, 2),
			);
		}
	});

	it(`should validate env variables even when ignoreEnvFile is true with Zod`, async () => {
		try {
			const module = await Test.createTestingModule({
				imports: [AppModule.withZodSchemaValidation(undefined, true)],
			}).compile();

			app = module.createNestApplication();
			await app.init();
		} catch (err) {
			const message = [{ "expected": "string", "code": "invalid_type", "path": ["PORT"], "message": "Invalid input: expected string, received undefined" }, { "expected": "string", "code": "invalid_type", "path": ["DATABASE_NAME"], "message": "Invalid input: expected string, received undefined" }]
			expect(err.message).toEqual(
				'Config validation error: ' + JSON.stringify(message, null, 2),
			);
		}
	});

	it(`should parse loaded env variables with Zod`, async () => {
		const module = await Test.createTestingModule({
			imports: [AppModule.withZodSchemaValidation(join(__dirname, '.env.valid'))],
		}).compile();

		app = module.createNestApplication();
		await app.init();

		const configService = app.get(ConfigService);
		expect(typeof configService.get('PORT')).toEqual('number');
		expect(typeof configService.get('DATABASE_NAME')).toEqual('string');
	});
}); 