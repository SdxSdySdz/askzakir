import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
`);

export const stmts = {
  insertUser: db.prepare(
    'INSERT INTO users (login, password_hash, created_at) VALUES (?, ?, ?)'
  ),
  getUserByLogin: db.prepare('SELECT * FROM users WHERE login = ?'),
  getUserById: db.prepare('SELECT id, login, created_at FROM users WHERE id = ?'),

  insertSession: db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ),
  getSession: db.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?'
  ),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  purgeExpired: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),

  insertChat: db.prepare(
    'INSERT INTO chats (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ),
  getChat: db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?'),
  listChats: db.prepare(
    'SELECT id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200'
  ),
  touchChat: db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?'),
  deleteChat: db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?'),

  insertMessage: db.prepare(
    'INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  ),
  listMessages: db.prepare(
    'SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 100'
  ),
};
