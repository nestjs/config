import { registerAs } from '../../lib/utils';

export default registerAs('database.driver', () => ({
  host: 'host',
  port: 4000,
}));
