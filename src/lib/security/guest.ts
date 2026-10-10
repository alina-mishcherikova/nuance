import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const GUEST_TTL_SECONDS = 7 * 24 * 60 * 60;
export function createGuestCredential() {
  const token = randomBytes(32).toString('base64url');
  return { token, verifier: hashGuestToken(token) };
}
export function hashGuestToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function verifyGuestToken(
  token: string,
  record: { verifier: string; expiresAt: Date; revokedAt: Date | null },
  now = new Date(),
): boolean {
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !/^[a-f0-9]{64}$/.test(record.verifier) ||
    record.revokedAt ||
    record.expiresAt <= now
  )
    return false;
  return timingSafeEqual(
    Buffer.from(hashGuestToken(token), 'hex'),
    Buffer.from(record.verifier, 'hex'),
  );
}
export function guestCookie(roomId: string, secure = true) {
  if (!/^[a-f0-9-]{36}$/.test(roomId))
    throw new Error('Invalid room identifier');
  return {
    name: `nuance-guest-${roomId}`,
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/api/rooms',
    maxAge: GUEST_TTL_SECONDS,
  };
}
