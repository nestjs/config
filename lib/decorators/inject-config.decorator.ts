import { Inject } from '@nestjs/common';
import { getConfigToken } from '../utils';

export const InjectConfig = (token: string = '') =>
  Inject(getConfigToken(token));
