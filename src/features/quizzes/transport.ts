import 'server-only';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const privateHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return json({ error: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: 'INVALID_INPUT' }, 400);
  if (
    error instanceof Error &&
    ['INVALID_ANSWERS', 'REQUIRED_ANSWERS', 'INVALID_DOCUMENT'].includes(
      error.message,
    )
  )
    return json({ error: error.message }, 400);
  return json({ error: 'UNAVAILABLE' }, 503); // No payloads, SQL messages or exception details in response/log.
}
export async function requestBody(
  request: Request,
  limit = 200_000,
): Promise<unknown> {
  if (
    request.headers.get('origin') !==
    new URL(process.env.BETTER_AUTH_URL ?? '').origin
  )
    throw new ApiError('FORBIDDEN', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError('INVALID_INPUT', 400);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_INPUT');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.length;
    if (bytes > limit) {
      await reader.cancel();
      throw new ApiError('TOO_LARGE', 413);
    }
    chunks.push(part.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError('INVALID_INPUT');
  }
}
export async function applicationRate(scope: string, principal?: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new ApiError('UNAVAILABLE', 503);
  for (const identity of [
    `peer:${scope}`,
    ...(principal ? [`principal:${scope}:${principal}`] : []),
  ]) {
    const key = createHmac('sha256', secret).update(identity).digest('hex');
    const now = Date.now();
    const result = await db.execute(
      sql`INSERT INTO auth_rate_limits(key,count,last_request) VALUES(${key},1,${now}) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_rate_limits.last_request<${now - 60000} THEN 1 ELSE auth_rate_limits.count+1 END,last_request=CASE WHEN auth_rate_limits.last_request<${now - 60000} THEN ${now} ELSE auth_rate_limits.last_request END RETURNING count`,
    );
    if (Number(result.rows[0]?.count) > 120)
      throw new ApiError('RATE_LIMITED', 429);
  }
}
