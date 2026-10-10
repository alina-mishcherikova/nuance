import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
const intl = createMiddleware(routing);
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${process.env.NODE_ENV === 'development' ? 'ws:' : ''}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = intl(new NextRequest(request, { headers }));
  // Forward nonce/CSP so Next can attach it to its scripts.
  response.headers.set('x-middleware-request-x-nonce', nonce);
  response.headers.set('x-middleware-request-content-security-policy', csp);
  const overrides = response.headers.get('x-middleware-override-headers');
  response.headers.set(
    'x-middleware-override-headers',
    [overrides, 'x-nonce', 'content-security-policy'].filter(Boolean).join(','),
  );
  response.headers.set('Content-Security-Policy', csp);
  if (
    /\/(account|moderation|auth|solo|builder|age|quizzes|catalog)(\/|$)/.test(
      request.nextUrl.pathname,
    )
  ) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
