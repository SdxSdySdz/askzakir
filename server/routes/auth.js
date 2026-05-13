import { Router } from 'express';
import {
  registerUser,
  authenticateUser,
  publicUser,
  UserError,
} from '../services/users.js';
import {
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  userFromRequest,
} from '../services/sessions.js';
import { config } from '../config.js';
import { loginLimiter, registerLimiter } from '../middleware/ratelimit.js';

export const authRouter = Router();

authRouter.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const user = await registerUser({ login: req.body?.login, password: req.body?.password });
    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(err.code === 'login_taken' ? 409 : 400).json({ error: err.code });
    }
    next(err);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const user = await authenticateUser({ login: req.body?.login, password: req.body?.password });
    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(401).json({ error: err.code });
    }
    next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  destroySession(req.cookies[config.cookieName]);
  clearSessionCookie(res);
  res.status(204).end();
});

// `/api/me` historically lives at the top of /api/, not /api/auth — preserved
// so the existing client (script.js) keeps working without changes.
export function meHandler(req, res) {
  const u = userFromRequest(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user: publicUser(u) });
}
