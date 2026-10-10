import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { soloGuests } from '@/db/schema';
import { currentSession } from '@/features/auth/session';
import {
  createGuestCredential,
  hashGuestToken,
  GUEST_TTL_SECONDS,
} from '@/lib/security/guest';
export const SOLO_COOKIE = 'nuance-solo';
export type SoloPrincipal = { userId: string } | { guestId: string };
export async function guestIdentity() {
  const token = (await cookies()).get(SOLO_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [guest] = await db
    .select({
      id: soloGuests.id,
      expiresAt: soloGuests.expiresAt,
      adultConfirmed: soloGuests.adultConfirmed,
    })
    .from(soloGuests)
    .where(
      and(
        eq(soloGuests.verifier, hashGuestToken(token)),
        gt(soloGuests.expiresAt, new Date()),
        isNull(soloGuests.revokedAt),
      ),
    );
  return guest ?? null;
}
export async function ensureGuest() {
  const existing = await guestIdentity();
  if (existing) return existing;
  const credential = createGuestCredential();
  const expiresAt = new Date(Date.now() + GUEST_TTL_SECONDS * 1000);
  const [guest] = await db
    .insert(soloGuests)
    .values({ verifier: credential.verifier, expiresAt })
    .returning({
      id: soloGuests.id,
      expiresAt: soloGuests.expiresAt,
      adultConfirmed: soloGuests.adultConfirmed,
    });
  (await cookies()).set(SOLO_COOKIE, credential.token, {
    httpOnly: true,
    secure: new URL(process.env.BETTER_AUTH_URL!).protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: GUEST_TTL_SECONDS,
  });
  return guest!;
}
export async function soloPrincipal(
  create = false,
): Promise<SoloPrincipal | null> {
  const session = await currentSession();
  if (session) return { userId: session.user.id };
  const guest = create ? await ensureGuest() : await guestIdentity();
  return guest ? { guestId: guest.id } : null;
}
export async function adultAllowed() {
  return (await guestIdentity())?.adultConfirmed === true;
}
