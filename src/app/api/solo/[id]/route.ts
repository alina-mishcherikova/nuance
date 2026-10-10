import { z } from 'zod';
import { soloPrincipal, adultAllowed } from '@/features/solo/identity';
import { readAttempt, mutateAttempt } from '@/features/solo/service';
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
    const principal = await soloPrincipal();
    if (!principal) throw new ApiError('NOT_FOUND', 404);
    return json(await readAttempt(id, principal, await adultAllowed()));
  } catch (error) {
    return failure(error);
  }
}
async function mutation(request: Request, context: Context, submit: boolean) {
  try {
    const input = await requestBody(request, 40000),
      id = z.uuid().parse((await context.params).id);
    const principal = await soloPrincipal();
    if (!principal) throw new ApiError('NOT_FOUND', 404);
    await applicationRate(
      'solo-write',
      'userId' in principal ? principal.userId : principal.guestId,
    );
    return json(
      await mutateAttempt(id, principal, input, submit, await adultAllowed()),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  return mutation(request, context, false);
}
export async function POST(request: Request, context: Context) {
  return mutation(request, context, true);
}
