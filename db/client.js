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
db.exec(schema);

// All prepared statements live here; routes/services never write raw SQL.
export const stmts = {
  insertUser: db.prepare(
    'INSERT INTO users (login, password_hash, created_at) VALUES (?, ?, ?)'
  ),
  getUserByLogin: db.prepare('SELECT * FROM users WHERE login = ?'),
  getUserById:    db.prepare('SELECT id, login, created_at FROM users WHERE id = ?'),

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
};
