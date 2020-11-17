import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

export function loadYmlFile() {
  let yamlResult = yaml.load(
    fs.readFileSync(join(__dirname, 'config.yml'), 'utf8'),
  );
  return JSON.stringify(yamlResult);
}
