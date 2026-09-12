-- AskZakir base schema. Loaded at boot via `db.exec(...)`.
-- A timestamped copy lives in migrations/0001_init.sql for the Phase 2 migration tool.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity
  ON users(provider, provider_user_id);

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

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK(plan_code IN ('plus','extra','ultra')),
  billing_period TEXT NOT NULL CHECK(billing_period IN ('monthly','annual','manual')),
  status TEXT NOT NULL CHECK(status IN ('active','canceled','expired')) DEFAULT 'active',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions(user_id, status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS usage_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  used_messages INTEGER NOT NULL DEFAULT 0 CHECK(used_messages >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, period_key)
);
CREATE INDEX IF NOT EXISTS idx_usage_periods_user_period
  ON usage_periods(user_id, period_key);

CREATE TABLE IF NOT EXISTS plan_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK(plan_code IN ('plus','extra','ultra')),
  billing_period TEXT NOT NULL CHECK(billing_period IN ('monthly','annual')),
  contact TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('new','handled','declined')) DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_requests_user_created
  ON plan_requests(user_id, created_at DESC);
