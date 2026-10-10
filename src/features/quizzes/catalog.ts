import 'server-only';
import { and, eq, sql, desc, ilike, asc, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import * as s from '@/db/schema';
import { readDocument } from './repository';
import { translationDeficiencies, type Locale } from '@/lib/validation/quiz';
export const catalogQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(80)
    .default('')
    .transform((s) => s.replace(/[%_\\\u0000-\u001f]/g, '')),
  category: z
    .string()
    .regex(/^[a-z0-9-]{0,60}$/)
    .default(''),
  tag: z
    .string()
    .regex(/^[a-z0-9-]{0,60}$/)
    .default(''),
  sort: z.enum(['featured', 'new', 'title']).default('featured'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export async function eligibleVersion(id: string, adultAllowed: boolean) {
  if (!z.uuid().safeParse(id).success) return null;
  const [version] = await db
    .select({
      id: s.quizVersions.id,
      adult: s.quizVersions.adultOnly,
      categoryAdult: s.categories.adultOnly,
    })
    .from(s.quizVersions)
    .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
    .where(
      and(
        eq(s.quizVersions.id, id),
        eq(s.quizVersions.status, 'PUBLISHED'),
        eq(s.quizVersions.approved, true),
        eq(s.quizVersions.archived, false),
        sql`exists(select 1 from moderation_reviews mr where mr.version_id=${s.quizVersions.id} and mr.status='APPROVED')`,
      ),
    );
  if (!version || (!adultAllowed && (version.adult || version.categoryAdult)))
    return null;
  const document = await readDocument(id);
  return document && !translationDeficiencies(document).length
    ? document
    : null;
}
export async function publicCatalog(
  locale: Locale,
  raw: unknown,
  adultAllowed: boolean,
) {
  const query = catalogQuerySchema.parse(raw);
  const filters = [
    eq(s.quizVersions.status, 'PUBLISHED'),
    eq(s.quizVersions.approved, true),
    eq(s.quizVersions.archived, false),
    eq(s.quizCopy.locale, locale),
  ];
  if (!adultAllowed)
    filters.push(
      eq(s.quizVersions.adultOnly, false),
      eq(s.categories.adultOnly, false),
    );
  if (query.category) filters.push(eq(s.categories.slug, query.category));
  if (query.search) filters.push(ilike(s.quizCopy.title, `%${query.search}%`));
  if (query.tag)
    filters.push(
      sql`exists(select 1 from quiz_tags qt join tags t on t.id=qt.tag_id where qt.version_id=${s.quizVersions.id} and t.slug=${query.tag})`,
    );
  // Translation predicate excludes incomplete publication even if a legacy row is marked approved.
  filters.push(
    sql`(select count(*) from quiz_copy c where c.version_id=${s.quizVersions.id} and length(trim(c.title))>0 and length(trim(c.description))>0)=3`,
  );
  filters.push(
    sql`exists(select 1 from moderation_reviews mr where mr.version_id=${s.quizVersions.id} and mr.status='APPROVED')`,
  );
  filters.push(
    sql`(select count(*) from questions q where q.version_id=${s.quizVersions.id}) between 1 and 100`,
  );
  filters.push(
    sql`not exists(select 1 from questions q where q.version_id=${s.quizVersions.id} and (q.kind::text not in ('YES_NO_MAYBE','SINGLE_CHOICE','MULTIPLE_CHOICE','SCALE') or (select count(*) from question_copy c where c.question_id=q.id and length(trim(c.prompt))>0)<>3 or exists(select 1 from question_options o where o.question_id=q.id and (select count(*) from option_copy c where c.option_id=o.id and length(trim(c.label))>0)<>3)))`,
  );
  const base = () =>
    db
      .select({
        id: s.quizVersions.id,
        title: s.quizCopy.title,
        description: s.quizCopy.description,
        adult: s.quizVersions.adultOnly,
        featured: s.quizVersions.featured,
        publishedAt: s.quizVersions.publishedAt,
        count: sql<number>`(select count(*)::int from questions q where q.version_id=${s.quizVersions.id})`,
      })
      .from(s.quizVersions)
      .innerJoin(s.quizCopy, eq(s.quizCopy.versionId, s.quizVersions.id))
      .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
      .where(and(...filters));
  const localizedTitle =
    locale === 'uk'
      ? sql`${s.quizCopy.title} COLLATE "nuance_uk"`
      : locale === 'fr'
        ? sql`${s.quizCopy.title} COLLATE "nuance_fr"`
        : sql`${s.quizCopy.title} COLLATE "nuance_en"`;
  const order =
    query.sort === 'title'
      ? [asc(localizedTitle), asc(s.quizVersions.id)]
      : query.sort === 'featured'
        ? [
            desc(s.quizVersions.featured),
            desc(s.quizVersions.publishedAt),
            asc(s.quizVersions.id),
          ]
        : [desc(s.quizVersions.publishedAt), asc(s.quizVersions.id)];
  const rows = await base()
    .orderBy(...order)
    .limit(6)
    .offset((query.page - 1) * 6);
  const totals = await db
    .select({ total: count() })
    .from(s.quizVersions)
    .innerJoin(s.quizCopy, eq(s.quizCopy.versionId, s.quizVersions.id))
    .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
    .where(and(...filters));
  // Locale-specific ICU ordering is selected from fixed expressions.
  return {
    items: rows.map((row) => ({
      ...row,
      minutes: Math.max(1, Math.ceil((row.count * 25) / 60)),
    })),
    total: totals[0]?.total ?? 0,
    query,
  };
}
