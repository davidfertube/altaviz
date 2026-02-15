import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      organizationId: string;
      organizationName: string;
      role: string;
      subscriptionTier: string;
    };
  }

  interface User {
    organizationId?: string;
    organizationName?: string;
    role?: string;
    subscriptionTier?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    organizationId?: string;
    organizationName?: string;
    role?: string;
    subscriptionTier?: string;
    userId?: string;
  }
}

const providers: NextAuthConfig['providers'] = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      const password = credentials?.password as string;
      if (!email || !password) return null;

      // Dynamic imports to avoid Edge runtime bundling issues
      // (middleware imports this file but authorize only runs in Node.js runtime)
      const { query } = await import('./db');
      const bcrypt = await import('bcryptjs');

      const users = await query<{
        id: string;
        email: string;
        name: string;
        password_hash: string | null;
      }>(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (users.length === 0) return null;
      const user = users[0];
      if (!user.password_hash) return null;

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return null;

      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      return { id: user.id, email: user.email, name: user.name };
    },
  })
);

const isProduction = process.env.NODE_ENV === 'production';

export default {
  providers,
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: isProduction,
      },
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.role = token.role as string;
        session.user.subscriptionTier = token.subscriptionTier as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
