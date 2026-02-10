import type { NextAuthConfig } from 'next-auth';
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

if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || 'common'}/v2.0`,
    })
  );
}

// Edge-safe auth config (no database imports)
// Used by middleware for JWT session decoding only
export default {
  providers,
  pages: {
    signIn: '/login',
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
