import { registerAs } from '../../lib/utils/index.js';

export default registerAs('database.driver', () => ({
  host: 'host',
  port: 4000,
}));
