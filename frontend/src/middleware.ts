import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { rateLimitWithInfo } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const ALLOWED_ORIGINS = new Set([
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // CORS validation for API routes
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin) {
      // Strip www. for comparison to handle www/non-www mismatch
      const normalize = (u: string) => u.replace('://www.', '://');
      const requestHost = req.nextUrl.origin;
      const isSameOrigin = normalize(origin) === normalize(requestHost);
      if (!isSameOrigin && !ALLOWED_ORIGINS.has(origin)) {
        return new NextResponse(
          JSON.stringify({ error: 'Origin not allowed' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Stricter rate limiting for auth endpoints
    const isAuthRoute = pathname.startsWith('/api/auth');
    const limit = isAuthRoute ? 10 : 60;
    const window = isAuthRoute ? 60_000 : 60_000;

    const result = rateLimitWithInfo(`${ip}:${isAuthRoute ? 'auth' : 'api'}`, limit, window);
    const rateLimitHeaders = {
      'RateLimit-Limit': String(result.limit),
      'RateLimit-Remaining': String(result.remaining),
      'RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    };

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { ...rateLimitHeaders, 'Retry-After': '60', 'Content-Type': 'application/json' },
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Protect dashboard routes — redirect to login if unauthenticated
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return Response.redirect(loginUrl);
    }
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
