import { assertLocalDatabase, assertLocalApp } from './scripts/local-only';
import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
assertLocalDatabase(process.env.DATABASE_URL);
assertLocalApp(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000');
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
