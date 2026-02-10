import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { rateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { 'Retry-After': '60', 'Content-Type': 'application/json' },
        }
      );
    }
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
