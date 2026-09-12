import crypto from 'node:crypto';
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

const OAUTH_STATE_COOKIE = 'az_oauth_state';

function getGoogleRedirectUri(req) {
  if (config.appUrl) {
    return `${config.appUrl.replace(/\/+$/, '')}/api/auth/google/callback`;
  }
  const host = req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  return `${proto}://${host}/api/auth/google/callback`;
}

// ─── Google OAuth Flow ───────────────────────────────────────────────────

authRouter.get('/google', (req, res) => {
  if (!config.googleClientId) {
    return res.status(500).send('Google Client ID is not configured on server.');
  }

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = getGoogleRedirectUri(req);

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  const cookieState = req.cookies[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
  });

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return res.redirect('/?auth_error=state_mismatch');
  }

  try {
    const redirectUri = getGoogleRedirectUri(req);

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange error:', errText);
      return res.redirect('/?auth_error=token_exchange_failed');
    }

    const tokenData = await tokenRes.json();

    // Fetch user profile from OpenID endpoint
    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return res.redirect('/?auth_error=userinfo_failed');
    }

    const userInfo = await userInfoRes.json();
    const providerUserId = userInfo.sub || userInfo.id;
    const email = userInfo.email || '';
    const displayName = userInfo.name || email.split('@')[0] || 'Google User';

    if (!providerUserId) {
      return res.redirect('/?auth_error=no_user_id');
    }

    const user = await signInWithProvider({
      provider: 'google',
      providerUserId,
      displayName,
    });

    const sessionToken = createSession(user.id);
    setSessionCookie(req, res, sessionToken);

    return res.redirect('/?auth_success=1');
  } catch (err) {
    console.error('OAuth callback processing failed:', err);
    return res.redirect('/?auth_error=internal_error');
  }
});

// Fallback / legacy endpoint
authRouter.post('/provider', providerAuthLimiter, async (req, res, next) => {
  try {
    const user = await signInWithProvider({
      provider: req.body?.provider,
      providerUserId: req.body?.providerUserId,
      displayName: req.body?.displayName,
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

// `/api/me` historically lives at the top of /api/, not /api/auth
export function meHandler(req, res) {
  const u = userFromRequest(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user: publicUser(u), billing: getBillingForUser(u.id) });
}
