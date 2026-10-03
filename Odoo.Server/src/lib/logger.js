import pino from 'pino';
import { config } from '../config/index.js';

const redactions = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.apiKey',
  '*.secret',
  'mongoUri',
  'DATABASE',
  'MONGODB_URI',
];

export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  redact: {
    paths: redactions,
    censor: '[Redacted]',
  },
  base: {
    app: config.appName,
    env: config.nodeEnv,
  },
});

/**
 * pino-http options for Express.
 */
export function httpLoggerOptions() {
  return {
    logger,
    genReqId: (req) => req.id || req.headers['x-request-id'],
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
        };
      },
    },
  };
}

export default logger;
