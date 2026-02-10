import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { query } from './db';
import authConfig from './auth.config';

async function findOrCreateUser(profile: {
  email: string;
  name?: string;
  azure_ad_id?: string;
  avatar_url?: string;
}) {
  const existing = await query<{
    id: string;
    organization_id: string;
    role: string;
    org_name: string;
    subscription_tier: string;
  }>(
    `SELECT u.id, u.organization_id, u.role, o.name as org_name, o.subscription_tier
     FROM users u
     JOIN organizations o ON u.organization_id = o.id
     WHERE u.email = $1`,
    [profile.email]
  );

  if (existing.length > 0) {
    await query(
      'UPDATE users SET last_login_at = NOW(), name = COALESCE($2, name) WHERE id = $1',
      [existing[0].id, profile.name]
    );
    return existing[0];
  }

  const orgSlug = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const orgName = profile.name ? `${profile.name}'s Organization` : `${orgSlug} org`;

  const orgs = await query<{ id: string; name: string; subscription_tier: string }>(
    `INSERT INTO organizations (name, slug, subscription_tier, max_compressors)
     VALUES ($1, $2, 'free', 2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, subscription_tier`,
    [orgName, orgSlug + '-' + Date.now().toString(36)]
  );

  const org = orgs[0];

  const users = await query<{ id: string; role: string }>(
    `INSERT INTO users (organization_id, email, name, azure_ad_id, avatar_url, role, last_login_at)
     VALUES ($1, $2, $3, $4, $5, 'owner', NOW())
     RETURNING id, role`,
    [org.id, profile.email, profile.name, profile.azure_ad_id, profile.avatar_url]
  );

  return {
    id: users[0].id,
    organization_id: org.id,
    role: users[0].role,
    org_name: org.name,
    subscription_tier: org.subscription_tier,
  };
}

// Extend edge-safe providers with dev credentials (Node.js only)
const providers = [...authConfig.providers];

if (process.env.NODE_ENV === 'development' && process.env.DEV_CREDENTIALS_ENABLED === 'true') {
  const DEV_ALLOWED_EMAILS = (process.env.DEV_ALLOWED_EMAILS || 'admin@altaviz.com').split(',').map(e => e.trim());
  providers.push(
    Credentials({
      name: 'Development Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@altaviz.com' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email || !DEV_ALLOWED_EMAILS.includes(email)) return null;

        const user = await findOrCreateUser({
          email,
          name: email.split('@')[0],
        });

        return {
          id: user.id,
          email,
          name: email.split('@')[0],
          organizationId: user.organization_id,
          organizationName: user.org_name,
          role: user.role,
          subscriptionTier: user.subscription_tier,
        };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === 'microsoft-entra-id' && profile?.email) {
        const dbUser = await findOrCreateUser({
          email: profile.email as string,
          name: (profile.name as string) || undefined,
          azure_ad_id: profile.sub ?? undefined,
          avatar_url: (profile.picture as string) || undefined,
        });

        user.organizationId = dbUser.organization_id;
        user.organizationName = dbUser.org_name;
        user.role = dbUser.role;
        user.subscriptionTier = dbUser.subscription_tier;
        user.id = dbUser.id;
      }
      return true;
    },
  },
});
