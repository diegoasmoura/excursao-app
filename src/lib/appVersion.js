import { version } from '../../package.json';

export const APP_VERSION = `V${String(version || '0.0.0').replace(/^v/i, '')}`;
