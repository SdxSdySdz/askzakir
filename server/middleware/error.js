import { reportError } from '../observability.js';

// Catch-all error handler. Last middleware in the stack.
// Логирует через pino + отправляет в Sentry (если DSN задан); клиенту — generic 500.
export function errorHandler(err, req, res, _next) {
  reportError(err, { reqId: req.id, method: req.method, url: req.url });
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal' });
}
