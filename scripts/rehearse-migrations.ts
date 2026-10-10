import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
const url = new URL(process.env.DATABASE_URL ?? '');
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname)
)
  throw new Error('Migration rehearsal is local development only');
const database = `nuance_rehearsal_${randomBytes(8).toString('hex')}`;
const admin = new Pool({ connectionString: url.toString() });
let temporary: Pool | undefined;
try {
  // Identifier comes only from a constant prefix and locally generated hex, never user input.
  await admin.query(`CREATE DATABASE "${database}"`);
  url.pathname = `/${database}`;
  temporary = new Pool({ connectionString: url.toString() });
  const db = drizzle(temporary);
  await migrate(db, { migrationsFolder: './drizzle' });
  await migrate(db, { migrationsFolder: './drizzle' });
  const tables = await temporary.query(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  if (tables.rows[0]?.count !== 29)
    throw new Error('Unexpected schema table count');
  console.info(
    'Fresh migration rehearsal passed: 29 tables, guard migrations, idempotent reapply.',
  );
} finally {
  await temporary?.end();
  // Remove only the ephemeral database this command just created; never the configured DB.
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
  await admin.end();
}
