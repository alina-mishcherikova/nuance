export type Role = 'guest' | 'user' | 'moderator' | 'admin';
export type Principal =
  | { kind: 'guest'; participantId: string; roomId: string }
  | { kind: 'user'; userId: string; role: Exclude<Role, 'guest'> };
export function canModerate(principal: Principal | null) {
  return (
    principal?.kind === 'user' &&
    (principal.role === 'moderator' || principal.role === 'admin')
  );
}
export function ownsResource(
  principal: Principal | null,
  resource: {
    userId?: string | null;
    participantId?: string | null;
    roomId?: string | null;
  },
) {
  if (!principal) return false;
  return principal.kind === 'user'
    ? resource.userId === principal.userId
    : resource.participantId === principal.participantId &&
        resource.roomId === principal.roomId;
}
