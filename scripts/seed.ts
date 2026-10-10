import { assertLocalDatabase } from './local-only';
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { categories, categoryCopy } from '../src/db/schema';
if (process.env.NODE_ENV === 'production')
  throw new Error('Development seed is disabled in production');
assertLocalDatabase(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const db = drizzle(pool);
  await db.transaction(async (tx) => {
    const [category] = await tx
      .insert(categories)
      .values({ slug: 'connection' })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { slug: 'connection' },
      })
      .returning({ id: categories.id });
    if (!category) throw new Error('Seed failed');
    await tx
      .insert(categoryCopy)
      .values([
        { categoryId: category.id, locale: 'en', name: 'Connection' },
        { categoryId: category.id, locale: 'uk', name: 'Близькість' },
        { categoryId: category.id, locale: 'fr', name: 'Complicité' },
      ])
      .onConflictDoNothing();
  });
  console.info(
    'Seeded localized category only; no quiz content or privileged accounts.',
  );
} finally {
  await pool.end();
}
