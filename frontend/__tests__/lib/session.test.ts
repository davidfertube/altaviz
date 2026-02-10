/**
 * Tests for session utilities.
 */

jest.mock('../../src/lib/auth', () => ({
  auth: jest.fn(),
}));

import { getAppSession, requireSession } from '../../src/lib/session';
import { auth } from '../../src/lib/auth';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('getAppSession', () => {
  it('returns null when no session exists', async () => {
    mockAuth.mockResolvedValue(null as any);
    const result = await getAppSession();
    expect(result).toBeNull();
  });

  it('returns null when session has no organizationId', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@b.com' } } as any);
    const result = await getAppSession();
    expect(result).toBeNull();
  });

  it('returns AppSession with all fields when session is valid', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@altaviz.com',
        name: 'Admin',
        organizationId: 'org-1',
        organizationName: 'Altaviz',
        role: 'owner',
        subscriptionTier: 'pro',
      },
    } as any);

    const result = await getAppSession();
    expect(result).toEqual({
      userId: 'user-1',
      email: 'admin@altaviz.com',
      name: 'Admin',
      organizationId: 'org-1',
      organizationName: 'Altaviz',
      role: 'owner',
      subscriptionTier: 'pro',
    });
  });
});

describe('requireSession', () => {
  it('throws when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(requireSession()).rejects.toThrow('Authentication required');
  });

  it('returns session when authenticated', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@altaviz.com',
        name: 'Admin',
        organizationId: 'org-1',
        organizationName: 'Altaviz',
        role: 'owner',
        subscriptionTier: 'pro',
      },
    } as any);

    const result = await requireSession();
    expect(result.organizationId).toBe('org-1');
    expect(result.role).toBe('owner');
  });
});
