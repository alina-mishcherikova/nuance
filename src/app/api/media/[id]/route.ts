import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db/client';
import * as s from '@/db/schema';
import { currentSession } from '@/features/auth/session';
import { adultAllowed } from '@/features/solo/identity';
import { eligibleVersion } from '@/features/quizzes/catalog';
import { retrieveImage } from '@/features/media/storage';
import {
  privateHeaders,
  failure,
  ApiError,
} from '@/features/quizzes/transport';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z.uuid().parse((await params).id);
    const session = await currentSession();
    const adult = await adultAllowed();
    const [asset] = await db
      .select({ key: s.mediaAssets.storageKey, ownerId: s.mediaAssets.ownerId })
      .from(s.mediaAssets)
      .where(and(eq(s.mediaAssets.id, id), eq(s.mediaAssets.status, 'READY')));
    if (!asset) throw new ApiError('NOT_FOUND', 404);
    if (!adult) {
      const [restricted] = await db
        .select({ id: s.quizVersions.id })
        .from(s.quizVersions)
        .leftJoin(s.questions, eq(s.questions.versionId, s.quizVersions.id))
        .where(
          and(
            eq(s.quizVersions.adultOnly, true),
            or(eq(s.quizVersions.coverId, id), eq(s.questions.imageId, id)),
          ),
        )
        .limit(1);
      if (restricted) throw new ApiError('NOT_FOUND', 404);
    }
    if (asset.ownerId !== session?.user.id) {
      const [published] = await db
        .select({ id: s.quizVersions.id })
        .from(s.quizVersions)
        .leftJoin(s.questions, eq(s.questions.versionId, s.quizVersions.id))
        .innerJoin(s.categories, eq(s.categories.id, s.quizVersions.categoryId))
        .where(
          and(
            eq(s.quizVersions.status, 'PUBLISHED'),
            eq(s.quizVersions.approved, true),
            eq(s.quizVersions.archived, false),
            or(eq(s.quizVersions.coverId, id), eq(s.questions.imageId, id)),
            ...(!adult
              ? [
                  eq(s.quizVersions.adultOnly, false),
                  eq(s.categories.adultOnly, false),
                ]
              : []),
          ),
        )
        .limit(1);
      if (!published || !(await eligibleVersion(published.id, adult)))
        throw new ApiError('NOT_FOUND', 404);
    }
    const object = await retrieveImage(asset.key);
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) throw new ApiError('NOT_FOUND', 404);
    return new Response(Buffer.from(bytes), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
