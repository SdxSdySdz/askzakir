import { Router } from 'express';
import {
  signInWithProvider,
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
import { getBillingForUser } from '../services/billing.js';
import { config } from '../config.js';
import { providerAuthLimiter } from '../middleware/ratelimit.js';

export const authRouter = Router();

authRouter.post('/provider', providerAuthLimiter, async (req, res, next) => {
  try {
    const user = await signInWithProvider({
      provider: req.body?.provider,
      providerUserId: req.body?.providerUserId,
    });
    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user, billing: getBillingForUser(user.id) });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(400).json({ error: err.code });
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
  res.json({ user: publicUser(u), billing: getBillingForUser(u.id) });
}
