import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import crypto from 'node:crypto';
import { config } from './config.js';

// Pretty-print в dev (читабельно глазами), JSON в prod (под journalctl + парсеры).
export const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProd ? 'info' : 'debug'),
  ...(config.isProd ? {} : {
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  }),
});

const SENTRY_DSN = process.env.SENTRY_DSN;
let sentryReady = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    logger.info('Sentry DSN not set — error tracking disabled');
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: config.isProd ? 'production' : 'development',
    tracesSampleRate: 0,        // ноль трейсов в фазе 0 — только errors
    sendDefaultPii: false,
  });
  sentryReady = true;
  logger.info('Sentry initialised');

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection');
    Sentry.captureException(reason);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    Sentry.captureException(err);
    // даём Sentry секунду на flush, потом падаем — systemd рестартует
    setTimeout(() => process.exit(1), 1000).unref();
  });
}

export function reportError(err, ctx) {
  logger.error({ err, ...(ctx || {}) }, err?.message || 'error');
  if (sentryReady) Sentry.captureException(err, { extra: ctx });
}

// pino-http middleware — структурированный лог на каждый запрос.
// req.log доступен в роутерах для контекстных сообщений.
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomBytes(6).toString('hex'),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      id: req.id, method: req.method, url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
