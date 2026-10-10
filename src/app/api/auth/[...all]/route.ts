import { getAuth } from '@/features/auth/auth';
import { authRateAllowed } from '@/features/auth/rate-limit';
import { authBodies } from '@/lib/validation/auth';
const response = (status: number) =>
  Response.json(
    { error: 'AUTH_REQUEST_FAILED' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
export async function POST(
  request: Request,
  { params }: { params: Promise<{ all: string[] }> },
) {
  if (request.headers.get('origin') !== process.env.BETTER_AUTH_URL)
    return response(403);
  const path = (await params).all.join('/');
  if (!Object.hasOwn(authBodies, path)) return response(404);
  const validator = authBodies[path as keyof typeof authBodies];
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return response(400);
  const raw = await request.text();
  if (raw.length > 4096) return response(413);
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return response(400);
  }
  const parsed = validator.safeParse(input);
  if (!parsed.success) return response(400);
  try {
    if (
      !(await authRateAllowed(
        path,
        'email' in parsed.data ? parsed.data.email : undefined,
      ))
    )
      return response(429);
    const forwarded = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(parsed.data),
    });
    const result = await getAuth().handler(forwarded);
    const headers = new Headers(result.headers);
    headers.set('Cache-Control', 'no-store');
    if (!result.ok)
      return new Response(JSON.stringify({ error: 'AUTH_REQUEST_FAILED' }), {
        status: result.status,
        headers,
      });
    // Mutation clients need only success. Do not expose synthetic/real user objects.
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch {
    return response(503);
  }
}
