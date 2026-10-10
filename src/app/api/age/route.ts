import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { soloGuests } from '@/db/schema';
import { ensureGuest } from '@/features/solo/identity';
import {
  requestBody,
  applicationRate,
  json,
  failure,
} from '@/features/quizzes/transport';
export async function POST(request: Request) {
  try {
    z.object({ adult: z.literal(true) })
      .strict()
      .parse(await requestBody(request));
    await applicationRate('age');
    const guest = await ensureGuest();
    await db
      .update(soloGuests)
      .set({ adultConfirmed: true })
      .where(eq(soloGuests.id, guest.id));
    return json({ confirmed: true });
  } catch (error) {
    return failure(error);
  }
}
