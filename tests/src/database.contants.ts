import { ConfigKey } from '../../lib/interfaces';

export const DATABASE_HOST: ConfigKey<string> = {
  propertyPath: 'database.host',
  defaultValue: 'host',
};

export const DATABASE_PORT: ConfigKey<number> = {
  propertyPath: 'database.port',
  defaultValue: 4000,
};
