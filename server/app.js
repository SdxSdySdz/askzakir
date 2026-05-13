import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { csrfGuard } from './middleware/csrf.js';
import { errorHandler } from './middleware/error.js';
import { authRouter, meHandler } from './routes/auth.js';
import { chatsRouter } from './routes/chats.js';
import { startSessionGc } from './services/sessions.js';
import { logger, httpLogger, initSentry } from './observability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export function createApp() {
  const app = express();

  // nginx terminates TLS; trust 1 hop so req.secure reflects X-Forwarded-Proto.
  app.set('trust proxy', 1);
  app.use(httpLogger);  // структурированный лог на каждый запрос: req.id, status, latency
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(cookieParser());

  // CSRF guard on /api before any /api router.
  app.use('/api', csrfGuard);

  // API routes
  app.use('/api/auth', authRouter);
  app.get('/api/me', meHandler);
  app.use('/api/chats', chatsRouter);

  // Static (after API so /api/* takes precedence).
  app.use(express.static(projectRoot, { index: 'index.html', extensions: ['html'] }));

  app.use(errorHandler);
  return app;
}

export function start() {
  initSentry();
  const app = createApp();
  startSessionGc();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, `AskZakir listening on http://localhost:${config.port}`);
  });
}
