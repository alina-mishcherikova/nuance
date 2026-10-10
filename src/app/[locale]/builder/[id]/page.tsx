import { adultAllowed } from '@/features/solo/identity';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { currentSession } from '@/features/auth/session';
import { readDraft } from '@/features/builder/service';
import { catalogFacets } from '@/features/quizzes/repository';
import { db } from '@/db/client';
import { categories, categoryCopy } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ApiError } from '@/features/quizzes/transport';
import { redirect } from '@/i18n/navigation';
import { DraftEditor } from '@/components/draft-editor';
import type { Locale } from '@/lib/validation/quiz';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Draft({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params,
    session = await currentSession();
  if (!session) return redirect({ href: '/auth/login', locale });
  if (!z.uuid().safeParse(id).success) notFound();
  let draft;
  try {
    draft = await readDraft(id, session.user.id, await adultAllowed());
  } catch (error) {
    if (error instanceof ApiError && error.code === 'AGE_REQUIRED')
      return redirect({ href: '/age', locale });
    if (error instanceof ApiError) notFound();
    throw error;
  }
  const [facets, allCategories] = await Promise.all([
    catalogFacets(locale as Locale),
    db
      .select({ slug: categories.slug, name: categoryCopy.name })
      .from(categories)
      .innerJoin(
        categoryCopy,
        and(
          eq(categories.id, categoryCopy.categoryId),
          eq(categoryCopy.locale, locale as Locale),
        ),
      ),
  ]);
  return (
    <DraftEditor
      initial={draft}
      categories={allCategories}
      tags={facets.tags}
    />
  );
}
