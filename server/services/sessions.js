import crypto from 'node:crypto';
import { stmts } from '../../db/client.js';
import { config } from '../config.js';

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  stmts.insertSession.run(token, userId, now, now + config.sessionTtlMs);
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const row = stmts.getSession.get(token);
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}

export function destroySession(token) {
  if (token) stmts.deleteSession.run(token);
}

export function userFromRequest(req) {
  const token = req.cookies[config.cookieName];
  const session = getSession(token);
  if (!session) return null;
  return stmts.getUserById.get(session.user_id);
}

// Cookie flags chosen here:
//   secure  = req.secure → driven by X-Forwarded-Proto via `trust proxy`, so it
//             toggles automatically for HTTP/HTTPS deploys without env-fiddling.
//   sameSite='lax' → blocks classic CSRF from cross-origin top-level POSTs.
//   httpOnly → cookie unreachable to client JS.
export function setSessionCookie(req, res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    maxAge: config.sessionTtlMs,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}

// Periodic cleanup of expired sessions; called from app.js.
export function startSessionGc() {
  setInterval(() => stmts.purgeExpired.run(Date.now()), 60 * 60 * 1000).unref();
}
