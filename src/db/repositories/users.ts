import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { user } from '../schema';
// Session principal only: never accept a browser-supplied userId.
export async function accountForPrincipal(principal: { userId: string }) {
  const [account] = await db
    .select({
      name: user.name,
      email: user.email,
      locale: user.locale,
      role: user.role,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.id, principal.userId))
    .limit(1);
  return account ?? null;
}
