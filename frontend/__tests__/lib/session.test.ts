/**
 * Tests for session utilities.
 */

jest.mock('../../src/lib/auth', () => ({
  auth: jest.fn(),
}));

import { getAppSession, requireSession, requireRole, meetsRoleLevel } from '../../src/lib/session';
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

describe('meetsRoleLevel', () => {
  it('owner meets all role levels', () => {
    expect(meetsRoleLevel('owner', 'viewer')).toBe(true);
    expect(meetsRoleLevel('owner', 'operator')).toBe(true);
    expect(meetsRoleLevel('owner', 'admin')).toBe(true);
    expect(meetsRoleLevel('owner', 'owner')).toBe(true);
  });

  it('admin meets admin and below', () => {
    expect(meetsRoleLevel('admin', 'viewer')).toBe(true);
    expect(meetsRoleLevel('admin', 'operator')).toBe(true);
    expect(meetsRoleLevel('admin', 'admin')).toBe(true);
    expect(meetsRoleLevel('admin', 'owner')).toBe(false);
  });

  it('operator meets operator and below', () => {
    expect(meetsRoleLevel('operator', 'viewer')).toBe(true);
    expect(meetsRoleLevel('operator', 'operator')).toBe(true);
    expect(meetsRoleLevel('operator', 'admin')).toBe(false);
    expect(meetsRoleLevel('operator', 'owner')).toBe(false);
  });

  it('viewer meets only viewer', () => {
    expect(meetsRoleLevel('viewer', 'viewer')).toBe(true);
    expect(meetsRoleLevel('viewer', 'operator')).toBe(false);
    expect(meetsRoleLevel('viewer', 'admin')).toBe(false);
    expect(meetsRoleLevel('viewer', 'owner')).toBe(false);
  });

  it('unknown role defaults to level 0 and fails all checks', () => {
    expect(meetsRoleLevel('unknown', 'viewer')).toBe(false);
    expect(meetsRoleLevel('', 'viewer')).toBe(false);
  });
});

describe('requireRole', () => {
  it('throws when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(requireRole('admin')).rejects.toThrow('Authentication required');
  });

  it('throws when role is not in allowed list', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'viewer@test.com',
        name: 'Viewer',
        organizationId: 'org-1',
        organizationName: 'Test',
        role: 'viewer',
        subscriptionTier: 'free',
      },
    } as any);

    await expect(requireRole('admin', 'owner')).rejects.toThrow('Insufficient permissions');
  });

  it('returns session when role is in allowed list', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        organizationId: 'org-1',
        organizationName: 'Test',
        role: 'admin',
        subscriptionTier: 'pro',
      },
    } as any);

    const result = await requireRole('admin', 'owner');
    expect(result.role).toBe('admin');
    expect(result.organizationId).toBe('org-1');
  });
});
