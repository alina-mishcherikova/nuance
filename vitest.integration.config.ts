import { assertLocalDatabase } from './scripts/local-only';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
assertLocalDatabase(process.env.DATABASE_URL);
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
