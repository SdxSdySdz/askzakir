import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    actionTimeout: 10_000,
  },
  // Playwright поднимет сервер сам. Отдельный порт и data-db, чтобы не конфликтовать с npm run dev.
  webServer: {
    command: 'node server.js',
    env: {
      PORT: '3001',
      DB_PATH: ':memory:',
      SESSION_SECRET: 'e2e-secret-not-used-anywhere-else',
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
    url: 'http://localhost:3001/',
    reuseExistingServer: false,
    timeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
