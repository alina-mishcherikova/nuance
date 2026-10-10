import { z } from 'zod';
import { soloPrincipal, adultAllowed } from '@/features/solo/identity';
import { startAttempt } from '@/features/solo/service';
import {
  requestBody,
  applicationRate,
  json,
  failure,
} from '@/features/quizzes/transport';
export async function POST(request: Request) {
  try {
    const { versionId } = z
      .object({ versionId: z.uuid() })
      .strict()
      .parse(await requestBody(request));
    await applicationRate('solo-start');
    const principal = (await soloPrincipal(true))!;
    return json(
      await startAttempt(versionId, principal, await adultAllowed()),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
