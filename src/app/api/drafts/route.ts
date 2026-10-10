import { adultAllowed } from '@/features/solo/identity';
import { z } from 'zod';
import { currentSession } from '@/features/auth/session';
import { createDraft } from '@/features/builder/service';
import {
  requestBody,
  applicationRate,
  json,
  failure,
  ApiError,
} from '@/features/quizzes/transport';
export async function POST(request: Request) {
  try {
    const data = z
      .object({ sourceId: z.uuid().optional() })
      .strict()
      .parse(await requestBody(request));
    const session = await currentSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 401);
    await applicationRate('draft-create', session.user.id);
    return json(
      await createDraft(session.user.id, data.sourceId, await adultAllowed()),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
