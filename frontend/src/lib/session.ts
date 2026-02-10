import { auth } from './auth';

export interface AppSession {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: string;
  subscriptionTier: string;
}

/**
 * Get the current authenticated session for server components / API routes.
 * Returns null if not authenticated.
 */
export async function getAppSession(): Promise<AppSession | null> {
  const session = await auth();
  if (!session?.user?.organizationId) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
    role: session.user.role,
    subscriptionTier: session.user.subscriptionTier,
  };
}

/**
 * Require authentication. Throws if not authenticated.
 * Use in API routes where auth is mandatory.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}
