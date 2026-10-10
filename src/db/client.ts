import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
const globalDb = globalThis as typeof globalThis & { nuancePool?: Pool };
export const pool =
  globalDb.nuancePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
if (process.env.NODE_ENV !== 'production') globalDb.nuancePool = pool;
export const db = drizzle(pool, { schema });
