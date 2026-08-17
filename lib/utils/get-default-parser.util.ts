import * as dotenv from 'dotenv';
import { Parser } from '../types/index.js';

export const getDefaultParser = (): Parser => dotenv.parse;
