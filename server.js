import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { db, stmts } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET is not set. Generate one with:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'az_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_COST = 12;
const LOGIN_RE = /^[a-zA-Z0-9_.\-]{3,32}$/;
// Dummy bcrypt hash to mitigate user-enumeration via timing on /login.
const DUMMY_HASH = bcrypt.hashSync('::dummy::', BCRYPT_COST);

const PLACEHOLDER_RESPONSE =
  'Этот ответ — временный шаблон. В будущем здесь появится осмысленный ответ ' +
  'нейронной сети. Пока что текст выводится в режиме потоковой передачи, ' +
  'слово за словом, чтобы вы могли почувствовать ритм будущего общения.';

setInterval(() => stmts.purgeExpired.run(Date.now()), 60 * 60 * 1000).unref();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// ─── Anti-CSRF: every non-GET /api/* must carry X-Requested-With: fetch ───
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.get('x-requested-with') !== 'fetch') {
    return res.status(403).json({ error: 'csrf' });
  }
  next();
});

// ─── Auth helpers ─────────────────────────────────────────────────────────
function setSessionCookie(req, res, token) {
  // req.secure relies on `trust proxy` to honour X-Forwarded-Proto from nginx,
  // so the cookie is `secure` only when the actual client connection is HTTPS.
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function currentUser(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  const session = stmts.getSession.get(token);
  if (!session || session.expires_at < Date.now()) return null;
  return stmts.getUserById.get(session.user_id);
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}

function publicUser(u) {
  return { id: u.id, login: u.login };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  stmts.insertSession.run(token, userId, now, now + SESSION_TTL_MS);
  return token;
}

// ─── Rate limits ──────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.login || '').toLowerCase()}`,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ─── /api/auth ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const login = String(req.body?.login ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!LOGIN_RE.test(login)) {
    return res.status(400).json({ error: 'invalid_login' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'invalid_password' });
  }
  if (stmts.getUserByLogin.get(login)) {
    return res.status(409).json({ error: 'login_taken' });
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const info = stmts.insertUser.run(login, hash, Date.now());
  const token = createSession(info.lastInsertRowid);
  setSessionCookie(req, res, token);
  res.json({ user: { id: info.lastInsertRowid, login } });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const login = String(req.body?.login ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const row = stmts.getUserByLogin.get(login);
  // Compare against a dummy hash if user doesn't exist, equalising response time.
  const hash = row ? row.password_hash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = createSession(row.id);
  setSessionCookie(req, res, token);
  res.json({ user: { id: row.id, login: row.login } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) stmts.deleteSession.run(token);
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user: publicUser(u) });
});

// ─── /api/chats ───────────────────────────────────────────────────────────
app.get('/api/chats', requireAuth, (req, res) => {
  const rows = stmts.listChats.all(req.user.id);
  res.json({ chats: rows });
});

app.get('/api/chats/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'not_found' });
  const chat = stmts.getChat.get(id, req.user.id);
  if (!chat) return res.status(404).json({ error: 'not_found' });
  const messages = stmts.listMessages.all(id);
  res.json({ chat: { id: chat.id, title: chat.title, messages } });
});

app.delete('/api/chats/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'not_found' });
  const info = stmts.deleteChat.run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

function titleFrom(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 40 ? clean.slice(0, 40).trimEnd() + '…' : (clean || 'Новый чат');
}

app.post('/api/chats/:id/messages', requireAuth, (req, res) => {
  const content = String(req.body?.content ?? '').trim();
  if (!content) return res.status(400).json({ error: 'empty_content' });
  if (content.length > 8000) return res.status(400).json({ error: 'too_long' });

  const now = Date.now();
  const idParam = req.params.id;

  const result = db.transaction(() => {
    let chatId;
    if (idParam === 'new') {
      const info = stmts.insertChat.run(req.user.id, titleFrom(content), now, now);
      chatId = info.lastInsertRowid;
    } else {
      const numericId = Number(idParam);
      if (!Number.isInteger(numericId)) throw Object.assign(new Error(), { status: 404 });
      const chat = stmts.getChat.get(numericId, req.user.id);
      if (!chat) throw Object.assign(new Error(), { status: 404 });
      chatId = numericId;
      stmts.touchChat.run(now, chatId);
    }

    const userInfo = stmts.insertMessage.run(chatId, 'user', content, now);
    const aiInfo = stmts.insertMessage.run(chatId, 'assistant', PLACEHOLDER_RESPONSE, now + 1);

    return {
      chatId,
      userMessage: { id: userInfo.lastInsertRowid, role: 'user', content, created_at: now },
      aiMessage: { id: aiInfo.lastInsertRowid, role: 'assistant', content: PLACEHOLDER_RESPONSE, created_at: now + 1 },
    };
  });

  try {
    res.json(result());
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'not_found' });
    throw err;
  }
});

// ─── Static (after API so /api/* takes precedence) ────────────────────────
app.use(express.static(__dirname, { index: 'index.html', extensions: ['html'] }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal' });
});

app.listen(PORT, () => {
  console.log(`AskZakir on http://localhost:${PORT}`);
});
