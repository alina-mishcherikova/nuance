import { assertLocalDatabase } from './scripts/local-only';
import 'dotenv/config';
import { defineConfig } from 'vitest/config';
assertLocalDatabase(process.env.DATABASE_URL);
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
