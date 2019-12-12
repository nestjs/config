import { ConfigService } from '../../lib';
import { registerAs } from '../../lib/utils';

export default registerAs('database', (configService: ConfigService) => ({
  host: 'host',
  port: 4000,
}));
