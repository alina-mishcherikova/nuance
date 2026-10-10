import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import * as s from '@/db/schema';
import {
  quizDocumentSchema,
  translationDeficiencies,
  type QuizDocument,
} from '@/lib/validation/quiz';
import {
  readDocument,
  writeDocument,
  type Executor,
} from '@/features/quizzes/repository';
import { ApiError } from '@/features/quizzes/transport';
export const draftSaveSchema = z
  .object({ revision: z.number().int().min(0), document: quizDocumentSchema })
  .strict();
async function owned(
  executor: Executor,
  id: string,
  userId: string,
  lock = false,
) {
  const query = executor
    .select({
      id: s.quizVersions.id,
      quizId: s.quizVersions.quizId,
      status: s.quizVersions.status,
      revision: s.quizVersions.revision,
    })
    .from(s.quizVersions)
    .innerJoin(s.quizzes, eq(s.quizzes.id, s.quizVersions.quizId))
    .where(and(eq(s.quizVersions.id, id), eq(s.quizzes.ownerId, userId)));
  const [version] = lock
    ? await query.for('update', { of: s.quizVersions })
    : await query;
  if (!version) throw new ApiError('NOT_FOUND', 404);
  return version;
}
export async function readDraft(id: string, userId: string, adult = false) {
  return db.transaction(async (tx) => {
    const version = await owned(tx, id, userId, true);
    const document = await readDocument(id, tx);
    if (!document) throw new ApiError('NOT_FOUND', 404);
    if (document.adultOnly && !adult) throw new ApiError('AGE_REQUIRED', 403);
    return {
      id: version.id,
      status: version.status,
      revision: version.revision,
      document,
      deficiencies: translationDeficiencies(document),
    };
  });
}

function emptyDocument(): QuizDocument {
  const blank = { en: '', uk: '', fr: '' };
  return {
    title: blank,
    description: blank,
    category: 'couples',
    tags: [],
    adultOnly: false,
    coverId: null,
    questions: [
      {
        id: randomUUID(),
        stableId: randomUUID(),
        type: 'YES_NO_MAYBE',
        prompt: blank,
        category: 'couples',
        required: true,
        weight: 1,
        imageId: null,
        options: ['yes', 'no', 'maybe'].map((value, i) => ({
          id: randomUUID(),
          value,
          label: {
            en: ['Yes', 'No', 'Maybe'][i]!,
            uk: ['Так', 'Ні', 'Можливо'][i]!,
            fr: ['Oui', 'Non', 'Peut-être'][i]!,
          },
        })),
      },
    ],
  };
}
export async function createDraft(
  userId: string,
  sourceId?: string,
  adult = false,
) {
  return db.transaction(async (tx) => {
    let document = emptyDocument(),
      quizId: string,
      versionNumber = 1;
    if (sourceId) {
      const source = await owned(tx, sourceId, userId, true);
      await tx
        .select()
        .from(s.quizzes)
        .where(eq(s.quizzes.id, source.quizId))
        .for('update');
      const original = await readDocument(sourceId, tx);
      if (!original) throw new ApiError('NOT_FOUND', 404);
      if (original.adultOnly && !adult) throw new ApiError('AGE_REQUIRED', 403);
      document = {
        ...original,
        questions: original.questions.map((q) => ({
          ...q,
          id: randomUUID(),
          options: q.options.map((o) => ({ ...o, id: randomUUID() })),
        })),
      };
      quizId = source.quizId;
      const [latest] = await tx
        .select({ version: sql<number>`max(${s.quizVersions.version})` })
        .from(s.quizVersions)
        .where(eq(s.quizVersions.quizId, quizId));
      versionNumber = Number(latest!.version) + 1;
    } else {
      const [quiz] = await tx
        .insert(s.quizzes)
        .values({ ownerId: userId, slug: `draft-${randomUUID()}` })
        .returning({ id: s.quizzes.id });
      quizId = quiz!.id;
    }
    const [category] = await tx
      .select()
      .from(s.categories)
      .where(eq(s.categories.slug, document.category));
    if (!category) throw new ApiError('UNAVAILABLE', 503);
    const [version] = await tx
      .insert(s.quizVersions)
      .values({
        quizId,
        version: versionNumber,
        categoryId: category.id,
        scoringConfig: {
          schemaVersion: 1,
          algorithm: 'agreement-v1',
          weights: [],
        },
      })
      .returning({ id: s.quizVersions.id });
    await writeDocument(tx, version!.id, document);
    return { id: version!.id };
  });
}
async function authorizedMedia(
  executor: Executor,
  document: QuizDocument,
  userId: string,
) {
  const ids = [
    ...new Set(
      [document.coverId, ...document.questions.map((q) => q.imageId)].filter(
        (id): id is string => !!id,
      ),
    ),
  ];
  if (!ids.length) return;
  const rows = await executor
    .select({ id: s.mediaAssets.id })
    .from(s.mediaAssets)
    .where(
      and(
        inArray(s.mediaAssets.id, ids),
        eq(s.mediaAssets.ownerId, userId),
        eq(s.mediaAssets.status, 'READY'),
      ),
    );
  if (rows.length !== ids.length) throw new ApiError('INVALID_DOCUMENT');
}
export async function saveDraft(
  id: string,
  userId: string,
  input: unknown,
  adult = false,
) {
  const data = draftSaveSchema.parse(input);
  return db.transaction(async (tx) => {
    const version = await owned(tx, id, userId, true);
    if (version.status !== 'DRAFT') throw new ApiError('FROZEN', 409);
    if (data.document.adultOnly && !adult)
      throw new ApiError('AGE_REQUIRED', 403);
    if (version.revision !== data.revision) throw new ApiError('CONFLICT', 409);
    await authorizedMedia(tx, data.document, userId);
    await writeDocument(tx, id, data.document);
    await tx
      .update(s.quizVersions)
      .set({ revision: version.revision + 1, updatedAt: new Date() })
      .where(eq(s.quizVersions.id, id));
    return {
      revision: version.revision + 1,
      deficiencies: translationDeficiencies(data.document),
    };
  });
}
export async function submitReview(
  id: string,
  userId: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    const version = await owned(tx, id, userId, true);
    if (version.status === 'PENDING') return { status: 'PENDING' };
    if (version.status !== 'DRAFT') throw new ApiError('FROZEN', 409);
    if (version.revision !== revision) throw new ApiError('CONFLICT', 409);
    const document = await readDocument(id, tx);
    if (!document || translationDeficiencies(document).length)
      throw new ApiError('INCOMPLETE_TRANSLATIONS');
    await tx
      .update(s.quizVersions)
      .set({ status: 'PENDING', revision: revision + 1, updatedAt: new Date() })
      .where(eq(s.quizVersions.id, id));
    await tx
      .insert(s.moderationReviews)
      .values({ versionId: id, status: 'PENDING' });
    return { status: 'PENDING' };
  });
}
export async function listDrafts(userId: string, adult = false) {
  return db
    .select({
      id: s.quizVersions.id,
      status: s.quizVersions.status,
      title: s.quizCopy.title,
      locale: s.quizCopy.locale,
    })
    .from(s.quizVersions)
    .innerJoin(s.quizzes, eq(s.quizzes.id, s.quizVersions.quizId))
    .innerJoin(s.quizCopy, eq(s.quizCopy.versionId, s.quizVersions.id))
    .where(
      and(
        eq(s.quizzes.ownerId, userId),
        ...(!adult ? [eq(s.quizVersions.adultOnly, false)] : []),
      ),
    )
    .limit(150);
}
