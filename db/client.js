import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH=':memory:' даёт изолированную in-memory БД для unit-тестов.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

export const db = new Database(dbPath);
if (dbPath !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const userColumns = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
  .get()
  ? db.prepare('PRAGMA table_info(users)').all().map((column) => column.name)
  : [];
if (userColumns.length > 0 && !userColumns.includes('provider')) {
  db.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS chats;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
  `);
}

db.exec(schema);

// All prepared statements live here; routes/services never write raw SQL.
export const stmts = {
  insertUser: db.prepare(
    'INSERT INTO users (provider, provider_user_id, display_name, created_at) VALUES (?, ?, ?, ?)'
  ),
  getUserByProviderIdentity: db.prepare(
    'SELECT * FROM users WHERE provider = ? AND provider_user_id = ?'
  ),
  getUserById:    db.prepare('SELECT id, provider, display_name, created_at FROM users WHERE id = ?'),

  insertSession:  db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ),
  getSession:     db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?'),
  deleteSession:  db.prepare('DELETE FROM sessions WHERE token = ?'),
  purgeExpired:   db.prepare('DELETE FROM sessions WHERE expires_at < ?'),

  insertChat: db.prepare(
    'INSERT INTO chats (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ),
  getChat:    db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?'),
  listChats:  db.prepare(
    'SELECT id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200'
  ),
  touchChat:  db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?'),
  deleteChat: db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?'),

  insertMessage: db.prepare(
    'INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  ),
  listMessages:  db.prepare(
    'SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 100'
  ),

  getActiveSubscription: db.prepare(
    `SELECT id, user_id, plan_code, billing_period, status, starts_at, ends_at, created_at
       FROM subscriptions
      WHERE user_id = ?
        AND status = 'active'
        AND starts_at <= ?
        AND (ends_at IS NULL OR ends_at > ?)
      ORDER BY created_at DESC, id DESC
      LIMIT 1`
  ),
  deactivateActiveSubscriptions: db.prepare(
    `UPDATE subscriptions
        SET status = 'canceled', ends_at = ?
      WHERE user_id = ?
        AND status = 'active'
        AND starts_at <= ?
        AND (ends_at IS NULL OR ends_at > ?)`
  ),
  insertSubscription: db.prepare(
    `INSERT INTO subscriptions
      (user_id, plan_code, billing_period, status, starts_at, ends_at, created_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?)`
  ),

  insertUsagePeriod: db.prepare(
    `INSERT OR IGNORE INTO usage_periods
      (user_id, period_key, used_messages, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)`
  ),
  getUsagePeriod: db.prepare(
    'SELECT id, user_id, period_key, used_messages, created_at, updated_at FROM usage_periods WHERE user_id = ? AND period_key = ?'
  ),
  incrementUsagePeriod: db.prepare(
    'UPDATE usage_periods SET used_messages = used_messages + 1, updated_at = ? WHERE user_id = ? AND period_key = ?'
  ),
  decrementUsagePeriod: db.prepare(
    'UPDATE usage_periods SET used_messages = MAX(used_messages - 1, 0), updated_at = ? WHERE user_id = ? AND period_key = ?'
  ),

  insertPlanRequest: db.prepare(
    `INSERT INTO plan_requests
      (user_id, plan_code, billing_period, contact, status, created_at)
      VALUES (?, ?, ?, ?, 'new', ?)`
  ),
};
