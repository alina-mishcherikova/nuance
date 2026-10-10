import { adultAllowed } from '@/features/solo/identity';
import { z } from 'zod';
import { currentSession } from '@/features/auth/session';
import { readDraft, saveDraft, submitReview } from '@/features/builder/service';
import {
  requestBody,
  applicationRate,
  json,
  failure,
  ApiError,
} from '@/features/quizzes/transport';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const id = z.uuid().parse((await context.params).id);
    const session = await currentSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 401);
    return json(await readDraft(id, session.user.id, await adultAllowed()));
  } catch (error) {
    return failure(error);
  }
}
async function mutate(request: Request, context: Context, review: boolean) {
  try {
    const data = await requestBody(request);
    const id = z.uuid().parse((await context.params).id);
    const session = await currentSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 401);
    await applicationRate('draft-write', session.user.id);
    return json(
      review
        ? await submitReview(
            id,
            session.user.id,
            z
              .object({ revision: z.number().int().min(0) })
              .strict()
              .parse(data).revision,
          )
        : await saveDraft(id, session.user.id, data, await adultAllowed()),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  return mutate(request, context, false);
}
export async function POST(request: Request, context: Context) {
  return mutate(request, context, true);
}
