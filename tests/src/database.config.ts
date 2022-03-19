import { registerAs, ConfigService } from '../../lib';

export default registerAs('database', (configService: ConfigService) => ({
    host: 'host',
    port: 4000,
    timeout: parseInt(configService.get('TIMEOUT', '0'), 10)
}));
