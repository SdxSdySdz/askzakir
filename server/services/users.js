import bcrypt from 'bcrypt';
import { stmts } from '../../db/client.js';
import { config } from '../config.js';

// Dummy bcrypt hash to mitigate user-enumeration via timing on /login: we run
// bcrypt.compare even for missing users so response time doesn't reveal account existence.
const DUMMY_HASH = bcrypt.hashSync('::dummy::', config.bcryptCost);

export class UserError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function normaliseLogin(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function validatePassword(raw) {
  const pw = String(raw ?? '');
  if (pw.length < config.passwordMin) throw new UserError('invalid_password');
  if (Buffer.byteLength(pw, 'utf8') > config.passwordMaxBytes) throw new UserError('invalid_password');
  return pw;
}

export async function registerUser({ login, password }) {
  login = normaliseLogin(login);
  if (!config.loginRe.test(login)) throw new UserError('invalid_login');
  const pw = validatePassword(password);
  if (stmts.getUserByLogin.get(login)) throw new UserError('login_taken');
  const hash = await bcrypt.hash(pw, config.bcryptCost);
  const info = stmts.insertUser.run(login, hash, Date.now());
  return { id: info.lastInsertRowid, login };
}

export async function authenticateUser({ login, password }) {
  login = normaliseLogin(login);
  const pw = String(password ?? '');
  const row = stmts.getUserByLogin.get(login);
  const hash = row ? row.password_hash : DUMMY_HASH;
  const ok = await bcrypt.compare(pw, hash);
  if (!row || !ok) throw new UserError('invalid_credentials');
  return { id: row.id, login: row.login };
}

export function publicUser(u) {
  return { id: u.id, login: u.login };
}
