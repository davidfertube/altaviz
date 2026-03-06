import { rateLimitWithInfo } from '@/lib/rate-limit';
import { NextResponse, NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS validation for API routes
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin) {
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
    const isAuthRoute = pathname.startsWith('/api/auth');
    const limit = isAuthRoute ? 10 : 60;
    const window = 60_000;

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

    const response = NextResponse.next();
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
