import * as dotenv from 'dotenv';
import { Parser } from '../types';

export const getDefaultParser = (): Parser => dotenv.parse;
