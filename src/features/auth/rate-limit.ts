import 'server-only';
import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
// Never trust a caller-controlled forwarded IP. Until a trusted proxy is configured,
// requests share a conservative peer bucket, in addition to a keyed email bucket.
export async function authRateAllowed(path: string, email?: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Auth configuration unavailable');
  const buckets: [string, number][] = [[`peer:${path}`, 60]];
  if (email)
    buckets.push([`principal:${email}`, 15], [`principal:${path}:${email}`, 5]);
  for (const [identity, max] of buckets) {
    const key = createHmac('sha256', secret).update(identity).digest('hex');
    const now = Date.now();
    const result = await db.execute(
      sql`INSERT INTO auth_rate_limits (key,count,last_request) VALUES (${key},1,${now}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN auth_rate_limits.last_request<${now - 60000} THEN 1 ELSE auth_rate_limits.count+1 END,last_request=CASE WHEN auth_rate_limits.last_request<${now - 60000} THEN ${now} ELSE auth_rate_limits.last_request END RETURNING count`,
    );
    if (Number(result.rows[0]?.count) > max) return false;
  }
  return true;
}
