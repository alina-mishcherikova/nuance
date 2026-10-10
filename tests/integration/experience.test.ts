import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import * as s from '../../src/db/schema';
import { createGuestCredential } from '../../src/lib/security/guest';
import { seedDocuments } from '../../src/features/quizzes/seeds';
import type { Answer } from '../../src/lib/validation/quiz';
const state = vi.hoisted(() => ({ executor: undefined as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/db/client', () => ({
  db: new Proxy(
    {},
    {
      get: (_target, key) => {
        const target = state.executor as Record<PropertyKey, unknown>;
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    },
  ),
}));
import {
  startAttempt,
  readAttempt,
  mutateAttempt,
} from '../../src/features/solo/service';
import {
  createDraft,
  readDraft,
  saveDraft,
  submitReview,
} from '../../src/features/builder/service';
import {
  publicCatalog,
  eligibleVersion,
} from '../../src/features/quizzes/catalog';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const database = drizzle(pool, { schema: s });
let finish: () => void,
  transaction: Promise<unknown>,
  uid: string,
  other: string,
  guestId: string,
  versionId: string;
beforeEach(async () => {
  const ready = new Promise<void>((resolve) => {
    transaction = database
      .transaction(async (tx) => {
        state.executor = tx;
        resolve();
        await new Promise<void>((resolveFinish) => {
          finish = resolveFinish;
        });
        throw new Error('fixture rollback');
      })
      .catch((error) => {
        if (error.message !== 'fixture rollback') throw error;
      });
  });
  await ready;
  const tx = state.executor as typeof database;
  uid = randomUUID();
  other = randomUUID();
  await tx.insert(s.user).values([
    { id: uid, name: 'Test owner', email: `${uid}@example.test` },
    { id: other, name: 'Other owner', email: `${other}@example.test` },
  ]);
  const credential = createGuestCredential();
  const [guest] = await tx
    .insert(s.soloGuests)
    .values({
      verifier: credential.verifier,
      expiresAt: new Date(Date.now() + 6 * 86400000),
    })
    .returning();
  guestId = guest!.id;
  const [published] = await tx
    .select({ id: s.quizVersions.id })
    .from(s.quizVersions)
    .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
    .where(
      and(
        eq(s.categories.slug, 'couples'),
        eq(s.quizVersions.status, 'PUBLISHED'),
        eq(s.quizVersions.official, true),
      ),
    );
  if (!published) throw new Error('Run seed first');
  versionId = published.id;
});
afterEach(async () => {
  finish();
  await transaction;
});
afterAll(async () => {
  await pool.end();
});
async function validResponses(id: string) {
  const attempt = await readAttempt(id, { guestId }, false);
  return {
    attempt,
    responses: attempt.document.questions.map((q) =>
      q.type === 'SCALE'
        ? { questionId: q.id, type: 'SCALE', value: 4 }
        : { questionId: q.id, type: q.type, options: [q.options[0]!.id] },
    ) as Answer[],
  };
}
describe('real PostgreSQL stage 2 services', () => {
  it('catalog only exposes approved complete public snapshots and gates adult detail', async () => {
    const catalog = await publicCatalog('en', {}, false);
    expect(catalog.total).toBe(7);
    expect(catalog.items.every((i) => !i.adult)).toBe(true);
    const adult = await publicCatalog('fr', { search: 'Intimité' }, false);
    expect(adult.items).toHaveLength(0);
    const permitted = await publicCatalog('fr', { search: 'Intimité' }, true);
    expect(permitted.items).toHaveLength(1);
    expect(await eligibleVersion(permitted.items[0]!.id, false)).toBeNull();
    const draft = await createDraft(uid);
    expect(await eligibleVersion(draft.id, true)).toBeNull();
    expect(await eligibleVersion(randomUUID(), true)).toBeNull();
  });
  it('guest starts, resumes and cannot be impersonated or read by a quiz owner', async () => {
    const { id } = await startAttempt(versionId, { guestId }, false);
    const { attempt, responses } = await validResponses(id);
    await mutateAttempt(
      id,
      { guestId },
      { versionId, revision: 0, responses: [responses[0]] },
      false,
      false,
    );
    expect((await readAttempt(id, { guestId }, false)).responses).toEqual([
      responses[0],
    ]);
    for (const principal of [{ userId: uid }, { guestId: randomUUID() }])
      await expect(readAttempt(id, principal, false)).rejects.toMatchObject({
        status: 404,
      });
    await expect(
      mutateAttempt(
        id,
        { guestId },
        { versionId: randomUUID(), revision: 1, responses: [] },
        false,
        false,
      ),
    ).rejects.toThrow();
    expect(attempt.expiresAt).toBeTruthy();
  });
  it('serializes stale saves, rejects incomplete submission and freezes idempotent results', async () => {
    const { id } = await startAttempt(versionId, { guestId }, false),
      { responses } = await validResponses(id);
    await expect(
      mutateAttempt(
        id,
        { guestId },
        { versionId, revision: 0, responses: [] },
        true,
        false,
      ),
    ).rejects.toThrow('REQUIRED');
    await mutateAttempt(
      id,
      { guestId },
      { versionId, revision: 0, responses },
      false,
      false,
    );
    await expect(
      mutateAttempt(
        id,
        { guestId },
        { versionId, revision: 0, responses: [] },
        false,
        false,
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await mutateAttempt(
      id,
      { guestId },
      { versionId, revision: 1, responses },
      true,
      false,
    );
    const first = await readAttempt(id, { guestId }, false);
    expect(first.status).toBe('SUBMITTED');
    expect(first.result).toMatchObject({
      kind: 'solo',
      schemaVersion: 2,
      observation: 'high',
    });
    await mutateAttempt(
      id,
      { guestId },
      { versionId, revision: 0, responses: [] },
      true,
      false,
    );
    expect((await readAttempt(id, { guestId }, false)).result).toEqual(
      first.result,
    );
    await expect(
      mutateAttempt(
        id,
        { guestId },
        { versionId, revision: 2, responses: [] },
        false,
        false,
      ),
    ).rejects.toMatchObject({ code: 'FROZEN' });
    const tx = state.executor as typeof database;
    await expect(
      tx.transaction((t) =>
        t.delete(s.answers).where(eq(s.answers.attemptId, id)),
      ),
    ).rejects.toThrow();
  });
  it('denies expired/revoked guests immediately', async () => {
    const { id } = await startAttempt(versionId, { guestId }, false),
      tx = state.executor as typeof database;
    await tx
      .update(s.soloGuests)
      .set({ revokedAt: new Date() })
      .where(eq(s.soloGuests.id, guestId));
    await expect(readAttempt(id, { guestId }, false)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('expires guest access and rejects unowned media or ungated adult authoring', async () => {
    const tx = state.executor as typeof database;
    const attempt = await startAttempt(versionId, { guestId }, false);
    await tx
      .update(s.soloGuests)
      .set({
        createdAt: new Date(Date.now() - 2 * 86400000),
        expiresAt: new Date(Date.now() - 86400000),
      })
      .where(eq(s.soloGuests.id, guestId));
    await expect(
      readAttempt(attempt.id, { guestId }, false),
    ).rejects.toMatchObject({ status: 404 });
    const draft = await createDraft(uid);
    const document = seedDocuments()[0]!.document;
    document.coverId = randomUUID();
    await expect(
      saveDraft(draft.id, uid, { revision: 0, document }),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    const adult = seedDocuments()[7]!.document;
    await expect(
      saveDraft(draft.id, uid, { revision: 0, document: adult }),
    ).rejects.toMatchObject({ code: 'AGE_REQUIRED' });
    await saveDraft(draft.id, uid, { revision: 0, document: adult }, true);
    await expect(readDraft(draft.id, uid)).rejects.toMatchObject({
      code: 'AGE_REQUIRED',
    });
  });
  it('registered attempts deny other users and persist genuine results', async () => {
    const { id } = await startAttempt(versionId, { userId: uid }, false);
    await expect(
      readAttempt(id, { userId: other }, false),
    ).rejects.toMatchObject({ status: 404 });
    const attempt = await readAttempt(id, { userId: uid }, false);
    const responses = attempt.document.questions.map((q) =>
      q.type === 'SCALE'
        ? { questionId: q.id, type: 'SCALE', value: 2 }
        : { questionId: q.id, type: q.type, options: [q.options[0]!.id] },
    ) as Answer[];
    await mutateAttempt(
      id,
      { userId: uid },
      { versionId, revision: 0, responses },
      true,
      false,
    );
    expect(
      (await readAttempt(id, { userId: uid }, false)).result,
    ).toMatchObject({ observation: 'low' });
  });
  it('owner saves partial drafts, conflicts are explicit, cannot self-publish, review locks edits', async () => {
    const { id } = await createDraft(uid);
    const draft = await readDraft(id, uid);
    expect(draft.deficiencies.length).toBeGreaterThan(0);
    await expect(readDraft(id, other)).rejects.toMatchObject({ status: 404 });
    await expect(
      saveDraft(id, other, { revision: 0, document: draft.document }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(submitReview(id, uid, 0)).rejects.toMatchObject({
      code: 'INCOMPLETE_TRANSLATIONS',
    });
    const document = seedDocuments()[1]!.document;
    await saveDraft(id, uid, { revision: 0, document });
    await expect(
      saveDraft(id, uid, { revision: 0, document }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      saveDraft(id, uid, { revision: 1, document, status: 'PUBLISHED' }),
    ).rejects.toThrow();
    await submitReview(id, uid, 1);
    expect((await readDraft(id, uid)).status).toBe('PENDING');
    expect(await eligibleVersion(id, true)).toBeNull();
    await expect(
      saveDraft(id, uid, { revision: 2, document }),
    ).rejects.toMatchObject({ code: 'FROZEN' });
  });
  it('new versions preserve old snapshot and stable IDs while replacing relational IDs', async () => {
    const draft = await createDraft(uid);
    const document = seedDocuments()[2]!.document;
    await saveDraft(draft.id, uid, { revision: 0, document });
    const tx = state.executor as typeof database;
    await tx
      .insert(s.moderationReviews)
      .values({ versionId: draft.id, status: 'APPROVED' });
    await tx
      .update(s.quizVersions)
      .set({ status: 'PUBLISHED', approved: true, publishedAt: new Date() })
      .where(eq(s.quizVersions.id, draft.id));
    const clone = await createDraft(uid, draft.id),
      next = await readDraft(clone.id, uid);
    expect(next.document.questions[0]!.stableId).toBe(
      document.questions[0]!.stableId,
    );
    expect(next.document.questions[0]!.id).not.toBe(document.questions[0]!.id);
    next.document.title.en = 'A new title';
    await saveDraft(clone.id, uid, { revision: 0, document: next.document });
    expect((await eligibleVersion(draft.id, false))?.title.en).toBe(
      document.title.en,
    );
    await expect(
      tx.transaction((t) =>
        t
          .update(s.quizCopy)
          .set({ title: 'Mutation' })
          .where(eq(s.quizCopy.versionId, draft.id)),
      ),
    ).rejects.toThrow();
  });
});
