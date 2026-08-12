import pino, { type Logger } from 'pino';
import type { AppConfig } from './env.js';

export function createLogger(config: Pick<AppConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: 'sdi-digital-library-api', environment: config.NODE_ENV },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.signedUrl',
        '*.SUPABASE_SERVICE_ROLE_KEY',
        '*.SUPABASE_JWT_SECRET',
      ],
      censor: '[REDACTED]',
    },
  });
}
