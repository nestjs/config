import { join } from "path"
import * as fs from 'fs';
import { Test } from "@nestjs/testing";
import { ConfigModule } from "../../lib";


describe('Environment variables override', () => {
    const envFilePath = join(__dirname, '.env.override-test');

    beforeAll(() => {
        // Create a temporary .env file for test
        fs.writeFileSync(envFilePath, 'EXISTING_VAR=new_value');
    });

    afterAll(() => {
        // Clean up the temporary .env file
        if (fs.existsSync(envFilePath)) {
            fs.unlinkSync(envFilePath);
        }
    });

    it('should NOT override process.env when "override" is false', async () => {
        process.env.EXISTING_VAR = 'original_value';

        // Load the config module with override set to false
        await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    envFilePath: envFilePath,
                    override: false,
                }),
            ],
        }).compile();

        expect(process.env.EXISTING_VAR).toBe('original_value');
        delete process.env.EXISTING_VAR;
    });

    it('should override process.env when "override" is true', async () => {
        process.env.EXISTING_VAR = 'original_value';
        
        // Load the config module with override set to true
        await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    envFilePath: envFilePath,
                    override: true,
                }),
            ],
        }).compile();

        expect(process.env.EXISTING_VAR).toBe('new_value');
        delete process.env.EXISTING_VAR;
    });

})