import { registerAs } from '../../lib/utils';
import { loadYmlFile } from './loadYamFile';

let yamlArray = loadYmlFile();

export default registerAs('yaml', () => ({
  yamlArray,
}));
