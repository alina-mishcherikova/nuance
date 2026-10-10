import { assertLocalDatabase } from './local-only';
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as s from '../src/db/schema';
import { seedCategories, seedDocuments } from '../src/features/quizzes/seeds';
import { locales, translationDeficiencies } from '../src/lib/validation/quiz';
// Repository is server-only in the app; seed uses its implementation with react-server condition.
import { writeDocument } from '../src/features/quizzes/repository';
assertLocalDatabase(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const db = drizzle(pool);
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .insert(s.user)
      .values({ name: 'Nuance editorial', email: 'editorial@nuance.invalid' })
      .onConflictDoUpdate({
        target: s.user.email,
        set: { name: 'Nuance editorial' },
      })
      .returning();
    if (!owner) throw new Error('Seed failed');
    // No password, auth account, verified email or elevated role: this record cannot log in.
    for (const category of seedCategories) {
      const [row] = await tx
        .insert(s.categories)
        .values({ slug: category.slug, adultOnly: category.adultOnly })
        .onConflictDoUpdate({
          target: s.categories.slug,
          set: { adultOnly: category.adultOnly },
        })
        .returning();
      await tx
        .insert(s.categoryCopy)
        .values(
          locales.map((locale) => ({
            categoryId: row!.id,
            locale,
            name: category.name[locale],
          })),
        )
        .onConflictDoNothing();
    }
    const [tag] = await tx
      .insert(s.tags)
      .values({ slug: 'reflection' })
      .onConflictDoUpdate({ target: s.tags.slug, set: { slug: 'reflection' } })
      .returning();
    await tx
      .insert(s.tagCopy)
      .values(
        locales.map((locale, i) => ({
          tagId: tag!.id,
          locale,
          name: ['Reflection', 'Роздуми', 'Réflexion'][i]!,
        })),
      )
      .onConflictDoNothing();
    for (const { slug, document } of seedDocuments()) {
      if (translationDeficiencies(document).length)
        throw new Error('Incomplete seed');
      const [existing] = await tx
        .select()
        .from(s.quizzes)
        .where(eq(s.quizzes.slug, slug));
      if (existing) continue; // Never rewrite published snapshots on repeat seed.
      const [quiz] = await tx
        .insert(s.quizzes)
        .values({ ownerId: owner.id, slug })
        .returning();
      const [category] = await tx
        .select()
        .from(s.categories)
        .where(eq(s.categories.slug, document.category));
      const [version] = await tx
        .insert(s.quizVersions)
        .values({
          quizId: quiz!.id,
          version: 1,
          categoryId: category!.id,
          official: true,
          featured: ['couples', 'friends'].includes(document.category),
          scoringConfig: {
            schemaVersion: 1,
            algorithm: 'agreement-v1',
            weights: [],
          },
        })
        .returning();
      await writeDocument(tx, version!.id, document);
      await tx.insert(s.moderationReviews).values({
        versionId: version!.id,
        status: 'APPROVED',
        reason:
          'Original official development seed; EN/UK/FR completeness validated. Native-language editorial review remains a production prerequisite.',
      });
      await tx
        .update(s.quizVersions)
        .set({ approved: true, status: 'PUBLISHED', publishedAt: new Date() })
        .where(eq(s.quizVersions.id, version!.id));
    }
  });
  console.info(
    'Seeded eight original complete EN/UK/FR official quizzes, including gated 18+ content; no login credentials or privileged roles.',
  );
} finally {
  await pool.end();
}
