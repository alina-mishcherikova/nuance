import 'server-only';
import { and, eq, gt, isNull, or, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import * as s from '@/db/schema';
import type { SoloPrincipal } from './identity';
import { eligibleVersion } from '@/features/quizzes/catalog';
import { readDocument, type Executor } from '@/features/quizzes/repository';
import { ApiError } from '@/features/quizzes/transport';
import {
  saveAnswersSchema,
  validateAnswers,
  type Answer,
} from '@/lib/validation/quiz';
import {
  soloResultSchema,
  resultPayloadSchema,
} from '@/lib/validation/results';
import { soloResult } from '@/lib/scoring';
function owner(id: string, principal: SoloPrincipal) {
  return and(
    eq(s.attempts.id, id),
    isNull(s.attempts.roomId),
    'userId' in principal
      ? eq(s.attempts.userId, principal.userId)
      : and(
          eq(s.attempts.guestSessionId, principal.guestId),
          or(
            isNull(s.attempts.expiresAt),
            gt(s.attempts.expiresAt, new Date()),
          ),
        ),
  );
}
async function authorized(
  id: string,
  principal: SoloPrincipal,
  executor: Executor = db,
  lock = false,
) {
  const query = executor
    .select()
    .from(s.attempts)
    .where(
      and(
        owner(id, principal),
        or(isNull(s.attempts.expiresAt), gt(s.attempts.expiresAt, new Date())),
      ),
    );
  const rows = lock ? await query.for('update') : await query;
  const attempt = rows[0];
  if (!attempt) throw new ApiError('NOT_FOUND', 404);
  if ('guestId' in principal) {
    const [guest] = await executor
      .select({ id: s.soloGuests.id })
      .from(s.soloGuests)
      .where(
        and(
          eq(s.soloGuests.id, principal.guestId),
          isNull(s.soloGuests.revokedAt),
          gt(s.soloGuests.expiresAt, new Date()),
        ),
      );
    if (!guest) throw new ApiError('NOT_FOUND', 404);
  }
  return attempt;
}
export async function startAttempt(
  versionId: string,
  principal: SoloPrincipal,
  adult: boolean,
) {
  if (!(await eligibleVersion(versionId, adult)))
    throw new ApiError('NOT_FOUND', 404);
  let expiresAt = new Date(Date.now() + 7 * 86400000);
  if ('guestId' in principal) {
    const [guest] = await db
      .select()
      .from(s.soloGuests)
      .where(
        and(
          eq(s.soloGuests.id, principal.guestId),
          isNull(s.soloGuests.revokedAt),
          gt(s.soloGuests.expiresAt, new Date()),
        ),
      );
    if (!guest) throw new ApiError('NOT_FOUND', 404);
    expiresAt = guest.expiresAt;
  }
  const [attempt] = await db
    .insert(s.attempts)
    .values({
      versionId,
      userId: 'userId' in principal ? principal.userId : null,
      guestSessionId: 'guestId' in principal ? principal.guestId : null,
      expiresAt,
    })
    .returning({ id: s.attempts.id });
  return attempt!;
}
async function answerDTO(
  executor: Executor,
  attemptId: string,
): Promise<Answer[]> {
  const rows = await executor
    .select({
      id: s.answers.id,
      questionId: s.answers.questionId,
      scale: s.answers.scaleValue,
      type: s.questions.kind,
    })
    .from(s.answers)
    .innerJoin(s.questions, eq(s.questions.id, s.answers.questionId))
    .where(eq(s.answers.attemptId, attemptId));
  const selected = await executor
    .select({
      answerId: s.answerOptions.answerId,
      optionId: s.answerOptions.optionId,
    })
    .from(s.answerOptions)
    .innerJoin(s.answers, eq(s.answers.id, s.answerOptions.answerId))
    .where(eq(s.answers.attemptId, attemptId));
  return rows.map((a) =>
    a.type === 'SCALE'
      ? { questionId: a.questionId, type: 'SCALE' as const, value: a.scale! }
      : {
          questionId: a.questionId,
          type: a.type as 'YES_NO_MAYBE' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE',
          options: selected
            .filter((o) => o.answerId === a.id)
            .map((o) => o.optionId),
        },
  );
}
export async function readAttempt(
  id: string,
  principal: SoloPrincipal,
  adult: boolean,
) {
  return db.transaction(async (tx) => {
    const attempt = await authorized(id, principal, tx, true);
    const document = await readDocument(attempt.versionId, tx);
    if (!document || (document.adultOnly && !adult))
      throw new ApiError('NOT_FOUND', 404);
    const responses = await answerDTO(tx, id);
    const [result] =
      attempt.status === 'SUBMITTED'
        ? await tx
            .select({ payload: s.resultSnapshots.payload })
            .from(s.resultSnapshots)
            .where(eq(s.resultSnapshots.attemptId, id))
        : [];
    return {
      id: attempt.id,
      versionId: attempt.versionId,
      revision: attempt.revision,
      status: attempt.status,
      expiresAt: attempt.expiresAt!.toISOString(),
      document,
      responses,
      result: result ? resultPayloadSchema.parse(result.payload) : null,
    };
  });
}

export async function mutateAttempt(
  id: string,
  principal: SoloPrincipal,
  input: unknown,
  submit: boolean,
  adult: boolean,
) {
  const data = saveAnswersSchema.parse(input);
  return db.transaction(async (tx) => {
    const attempt = await authorized(id, principal, tx, true);
    if (data.versionId !== attempt.versionId)
      throw new ApiError('INVALID_INPUT');
    const document = await readDocument(attempt.versionId, tx);
    if (!document || (document.adultOnly && !adult))
      throw new ApiError('NOT_FOUND', 404);
    if (attempt.status === 'SUBMITTED') {
      if (!submit) throw new ApiError('FROZEN', 409);
      return { revision: attempt.revision, status: 'SUBMITTED' as const };
    }
    if (data.revision !== attempt.revision) throw new ApiError('CONFLICT', 409);
    validateAnswers(document, data.responses, submit);
    await tx.delete(s.answers).where(eq(s.answers.attemptId, id));
    for (const response of data.responses) {
      const [answer] = await tx
        .insert(s.answers)
        .values({
          attemptId: id,
          questionId: response.questionId,
          versionId: attempt.versionId,
          scaleValue: response.type === 'SCALE' ? response.value : null,
        })
        .returning({ id: s.answers.id });
      if (response.type !== 'SCALE')
        await tx.insert(s.answerOptions).values(
          response.options.map((optionId) => ({
            answerId: answer!.id,
            questionId: response.questionId,
            optionId,
          })),
        );
    }
    if (submit)
      await tx.insert(s.resultSnapshots).values({
        attemptId: id,
        algorithmVersion: 'solo-profile-v1',
        payload: soloResultSchema.parse(soloResult(document, data.responses)),
        expiresAt: attempt.expiresAt,
      });
    await tx
      .update(s.attempts)
      .set({
        revision: attempt.revision + 1,
        status: submit ? 'SUBMITTED' : 'IN_PROGRESS',
        submittedAt: submit ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(s.attempts.id, id));
    return {
      revision: attempt.revision + 1,
      status: submit ? ('SUBMITTED' as const) : ('IN_PROGRESS' as const),
    };
  });
}
export async function attemptHistory(userId: string) {
  return db
    .select({ id: s.attempts.id, completedAt: s.attempts.submittedAt })
    .from(s.attempts)
    .where(
      and(
        eq(s.attempts.userId, userId),
        eq(s.attempts.status, 'SUBMITTED'),
        gt(s.attempts.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(s.attempts.submittedAt))
    .limit(50);
}
