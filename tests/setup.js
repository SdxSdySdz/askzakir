// Vitest setup: запускается до загрузки src/ модулей. Прописывает env-vars,
// которые ожидает server/config.js. DB_PATH=:memory: → каждая test-suite чистая.

process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-for-vitest-only-not-used-for-anything-yet';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
