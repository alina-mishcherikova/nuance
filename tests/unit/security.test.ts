import { describe, it, expect } from 'vitest';
import {
  createGuestCredential,
  verifyGuestToken,
  guestCookie,
} from '../../src/lib/security/guest';
import {
  canModerate,
  ownsResource,
} from '../../src/lib/security/authorization';
import { authBodies } from '../../src/lib/validation/auth';
import { scoringConfigSchema } from '../../src/lib/validation/results';
import en from '../../messages/en.json';
import uk from '../../messages/uk.json';
import fr from '../../messages/fr.json';
describe('guest credentials', () => {
  it('accepts possession only and rejects stolen identity, mutation, expiry and revocation', () => {
    const a = createGuestCredential(),
      b = createGuestCredential();
    const record = {
      verifier: a.verifier,
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    };
    expect(verifyGuestToken(a.token, record)).toBe(true);
    for (const token of [b.token, 'nickname', 'ABCDEFGH', a.token + 'x', ''])
      expect(verifyGuestToken(token, record)).toBe(false);
    expect(
      verifyGuestToken(a.token, { ...record, expiresAt: new Date(0) }),
    ).toBe(false);
    expect(
      verifyGuestToken(a.token, { ...record, revokedAt: new Date() }),
    ).toBe(false);
    expect(verifyGuestToken(a.token, { ...record, verifier: 'bad' })).toBe(
      false,
    );
    expect(a.verifier).not.toContain(a.token);
  });
  it('scopes protected cookies', () => {
    expect(guestCookie('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/rooms',
      maxAge: 604800,
    });
  });
});
describe('deny by default', () => {
  it('does not grant ownership to admin or unrelated principals', () => {
    expect(ownsResource(null, { userId: 'a' })).toBe(false);
    expect(
      ownsResource(
        { kind: 'user', userId: 'b', role: 'admin' },
        { userId: 'a' },
      ),
    ).toBe(false);
    expect(
      ownsResource(
        { kind: 'guest', participantId: 'a', roomId: 'one' },
        { participantId: 'a', roomId: 'two' },
      ),
    ).toBe(false);
    expect(
      ownsResource(
        { kind: 'user', userId: 'a', role: 'user' },
        { userId: 'a' },
      ),
    ).toBe(true);
  });
  it('restricts moderation', () => {
    expect(canModerate(null)).toBe(false);
    expect(canModerate({ kind: 'user', userId: 'a', role: 'user' })).toBe(
      false,
    );
    expect(canModerate({ kind: 'user', userId: 'a', role: 'moderator' })).toBe(
      true,
    );
  });
  it('rejects role injection and unsupported scoring', () => {
    expect(
      authBodies['sign-up/email'].safeParse({
        name: 'A',
        email: 'a@example.test',
        password: 'example-password',
        role: 'admin',
      }).success,
    ).toBe(false);
    expect(
      scoringConfigSchema.safeParse({
        schemaVersion: 2,
        algorithm: 'made-up',
        weights: [],
      }).success,
    ).toBe(false);
  });
});
it('has complete locale key parity and nonempty copy', () => {
  for (const messages of [uk, fr]) {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
    expect(
      Object.values(messages).every((value) => value.trim().length > 0),
    ).toBe(true);
  }
});
