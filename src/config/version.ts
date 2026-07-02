import { config } from './app.config';
import pkg from '../../package.json';

export const versionInfo = {
  name: pkg.name,
  version: pkg.version,
  nodeEnv: config.nodeEnv,
};
