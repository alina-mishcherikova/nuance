import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import * as s from '@/db/schema';
import {
  locales,
  quizDocumentSchema,
  type QuizDocument,
} from '@/lib/validation/quiz';
export type Executor = Pick<
  typeof db,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;
export async function readDocument(
  versionId: string,
  executor: Executor = db,
): Promise<QuizDocument | null> {
  const [v] = await executor
    .select()
    .from(s.quizVersions)
    .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
    .where(eq(s.quizVersions.id, versionId));
  if (!v) return null;
  const copy = await executor
    .select()
    .from(s.quizCopy)
    .where(eq(s.quizCopy.versionId, versionId));
  const questions = await executor
    .select()
    .from(s.questions)
    .where(eq(s.questions.versionId, versionId))
    .orderBy(asc(s.questions.position));
  const questionIds = questions.map((q) => q.id);
  const qCopy = await (questionIds.length
    ? executor
        .select()
        .from(s.questionCopy)
        .where(inArray(s.questionCopy.questionId, questionIds))
    : []);
  const options = await (questionIds.length
    ? executor
        .select()
        .from(s.questionOptions)
        .where(inArray(s.questionOptions.questionId, questionIds))
        .orderBy(asc(s.questionOptions.position))
    : []);
  const tags = await executor
    .select({ slug: s.tags.slug })
    .from(s.quizTags)
    .innerJoin(s.tags, eq(s.tags.id, s.quizTags.tagId))
    .where(eq(s.quizTags.versionId, versionId));
  const oCopy = options.length
    ? await executor
        .select()
        .from(s.optionCopy)
        .where(
          inArray(
            s.optionCopy.optionId,
            options.map((o) => o.id),
          ),
        )
    : [];
  const localized = (
    get: (locale: (typeof locales)[number]) => string | undefined,
  ) => Object.fromEntries(locales.map((locale) => [locale, get(locale) ?? '']));
  const parsed = quizDocumentSchema.safeParse({
    title: localized((l) => copy.find((c) => c.locale === l)?.title),
    description: localized(
      (l) => copy.find((c) => c.locale === l)?.description,
    ),
    category: v.categories.slug,
    tags: tags.map((t) => t.slug),
    adultOnly: v.quiz_versions.adultOnly,
    coverId: v.quiz_versions.coverId,
    questions: questions.map((q) => ({
      id: q.id,
      stableId: q.stableId,
      type: q.kind,
      required: q.required,
      category: q.category,
      weight: q.weight,
      imageId: q.imageId,
      prompt: localized(
        (l) =>
          qCopy.find((c) => c.questionId === q.id && c.locale === l)?.prompt,
      ),
      options: options
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          value: o.value,
          label: localized(
            (l) =>
              oCopy.find((c) => c.optionId === o.id && c.locale === l)?.label,
          ),
        })),
      ...(q.kind === 'MULTIPLE_CHOICE'
        ? { min: q.minSelections, max: q.maxSelections }
        : {}),
    })),
  });
  return parsed.success ? parsed.data : null;
}
export async function writeDocument(
  executor: Executor,
  versionId: string,
  document: QuizDocument,
) {
  const [category] = await executor
    .select({ id: s.categories.id, adult: s.categories.adultOnly })
    .from(s.categories)
    .where(eq(s.categories.slug, document.category));
  if (!category || (category.adult && !document.adultOnly))
    throw new Error('INVALID_DOCUMENT');
  const tagRows = document.tags.length
    ? await executor
        .select()
        .from(s.tags)
        .where(inArray(s.tags.slug, document.tags))
    : [];
  if (tagRows.length !== document.tags.length)
    throw new Error('INVALID_DOCUMENT');
  await executor
    .update(s.quizVersions)
    .set({
      categoryId: category.id,
      adultOnly: document.adultOnly,
      coverId: document.coverId,
      scoringConfig: {
        schemaVersion: 1,
        algorithm: 'agreement-v1',
        weights: document.questions.map((q) => ({
          questionId: q.id,
          weight: q.weight,
        })),
      },
    })
    .where(eq(s.quizVersions.id, versionId));
  await executor
    .delete(s.questions)
    .where(eq(s.questions.versionId, versionId));
  await executor.delete(s.quizCopy).where(eq(s.quizCopy.versionId, versionId));
  await executor.delete(s.quizTags).where(eq(s.quizTags.versionId, versionId));
  await executor.insert(s.quizCopy).values(
    locales.map((locale) => ({
      versionId,
      locale,
      title: document.title[locale],
      description: document.description[locale],
    })),
  );
  if (tagRows.length)
    await executor
      .insert(s.quizTags)
      .values(tagRows.map((t) => ({ versionId, tagId: t.id })));
  for (const [position, q] of document.questions.entries()) {
    const [questionCategory] = await executor
      .select({ id: s.categories.id, adult: s.categories.adultOnly })
      .from(s.categories)
      .where(eq(s.categories.slug, q.category));
    if (!questionCategory || (questionCategory.adult && !document.adultOnly))
      throw new Error('INVALID_DOCUMENT');
    await executor.insert(s.questions).values({
      id: q.id,
      versionId,
      stableId: q.stableId,
      position,
      kind: q.type,
      required: q.required,
      category: q.category,
      weight: q.weight,
      imageId: q.imageId,
      scaleMin: q.type === 'SCALE' ? 1 : null,
      scaleMax: q.type === 'SCALE' ? 5 : null,
      minSelections: q.type === 'MULTIPLE_CHOICE' ? q.min : 1,
      maxSelections: q.type === 'MULTIPLE_CHOICE' ? q.max : 1,
    });
    await executor.insert(s.questionCopy).values(
      locales.map((locale) => ({
        questionId: q.id,
        locale,
        prompt: q.prompt[locale],
      })),
    );
    for (const [optionPosition, o] of q.options.entries()) {
      await executor.insert(s.questionOptions).values({
        id: o.id,
        questionId: q.id,
        position: optionPosition,
        value: o.value,
      });
      await executor.insert(s.optionCopy).values(
        locales.map((locale) => ({
          optionId: o.id,
          locale,
          label: o.label[locale],
        })),
      );
    }
  }
}
export async function catalogFacets(
  locale: (typeof locales)[number],
  includeAdult = false,
) {
  const [categories, tags] = await Promise.all([
    db
      .select({ slug: s.categories.slug, name: s.categoryCopy.name })
      .from(s.categories)
      .innerJoin(
        s.categoryCopy,
        and(
          eq(s.categoryCopy.categoryId, s.categories.id),
          eq(s.categoryCopy.locale, locale),
        ),
      )
      .where(includeAdult ? undefined : eq(s.categories.adultOnly, false)),
    db
      .select({ slug: s.tags.slug, name: s.tagCopy.name })
      .from(s.tags)
      .innerJoin(
        s.tagCopy,
        and(eq(s.tagCopy.tagId, s.tags.id), eq(s.tagCopy.locale, locale)),
      ),
  ]);
  return { categories, tags };
}
