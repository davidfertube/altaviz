/**
 * Tests for /api/team routes: GET members, POST invite, PATCH role, DELETE member.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
  meetsRoleLevel: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getTeamMembers: jest.fn(),
  updateUserRole: jest.fn(),
  removeTeamMember: jest.fn(),
}));

jest.mock('../../src/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession, meetsRoleLevel } from '../../src/lib/session';
import { getTeamMembers, updateUserRole, removeTeamMember } from '../../src/lib/queries';
import { query } from '../../src/lib/db';
import { GET } from '../../src/app/api/team/route';
import { POST } from '../../src/app/api/team/invite/route';
import { PATCH, DELETE } from '../../src/app/api/team/members/[userId]/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockMeetsRoleLevel = meetsRoleLevel as jest.MockedFunction<typeof meetsRoleLevel>;
const mockGetTeamMembers = getTeamMembers as jest.MockedFunction<typeof getTeamMembers>;
const mockUpdateUserRole = updateUserRole as jest.MockedFunction<typeof updateUserRole>;
const mockRemoveTeamMember = removeTeamMember as jest.MockedFunction<typeof removeTeamMember>;
const mockQuery = query as jest.MockedFunction<typeof query>;

const adminSession = {
  userId: 'u1',
  email: 'admin@test.com',
  name: 'Admin User',
  organizationId: 'org-1',
  organizationName: 'TestOrg',
  role: 'admin',
  subscriptionTier: 'pro',
};

const viewerSession = {
  ...adminSession,
  userId: 'u2',
  role: 'viewer',
};

function makeInviteRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/team/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/team/members/target-user', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost:3000/api/team/members/target-user', {
    method: 'DELETE',
  });
}

const makeParams = (userId = 'target-user') => Promise.resolve({ userId });

describe('GET /api/team', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns team members when authenticated', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    const mockMembers = [
      { id: 'u1', email: 'admin@test.com', name: 'Admin', role: 'admin', last_login_at: null, created_at: '2026-01-01' },
      { id: 'u2', email: 'viewer@test.com', name: 'Viewer', role: 'viewer', last_login_at: null, created_at: '2026-01-02' },
    ];
    mockGetTeamMembers.mockResolvedValue(mockMembers);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockMembers);
    expect(mockGetTeamMembers).toHaveBeenCalledWith('org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockGetTeamMembers.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe('POST /api/team/invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await POST(makeInviteRequest({ email: 'new@test.com', role: 'viewer' }));
    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin tries to invite', async () => {
    mockGetAppSession.mockResolvedValue(viewerSession);
    mockMeetsRoleLevel.mockReturnValue(false);

    const response = await POST(makeInviteRequest({ email: 'new@test.com', role: 'viewer' }));
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Admin access required');
  });

  it('returns 400 for invalid email', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);

    const response = await POST(makeInviteRequest({ email: 'not-an-email', role: 'viewer' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Valid email required');
  });

  it('returns 400 for missing email', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);

    const response = await POST(makeInviteRequest({ role: 'viewer' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Valid email required');
  });

  it('returns 400 for invalid role', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);

    const response = await POST(makeInviteRequest({ email: 'new@test.com', role: 'superadmin' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid role. Must be admin, operator, or viewer');
  });

  it('returns 409 when user already exists in org', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockQuery.mockResolvedValueOnce([{ id: 'existing-user' }] as any);

    const response = await POST(makeInviteRequest({ email: 'existing@test.com', role: 'operator' }));
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe('User already in organization');
  });

  it('successfully invites a new user', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockQuery
      .mockResolvedValueOnce([])  // no existing user
      .mockResolvedValueOnce([{ id: 'new-user', email: 'new@test.com', role: 'operator' }] as any);  // insert

    const response = await POST(makeInviteRequest({ email: 'New@Test.com', role: 'operator' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('new@test.com');
    expect(body.user.role).toBe('operator');
    expect(body.message).toBe('Invited New@Test.com as operator');

    // Verify email was lowercased in the query
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM users'),
      ['new@test.com', 'org-1']
    );
  });
});

describe('PATCH /api/team/members/[userId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await PATCH(makePatchRequest({ role: 'operator' }), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin tries to update role', async () => {
    mockGetAppSession.mockResolvedValue(viewerSession);
    mockMeetsRoleLevel.mockReturnValue(false);

    const response = await PATCH(makePatchRequest({ role: 'operator' }), { params: makeParams() });
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Admin access required');
  });

  it('returns 400 for invalid role', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);

    const response = await PATCH(makePatchRequest({ role: 'owner' }), { params: makeParams() });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid role');
  });

  it('returns 404 when user not found', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockUpdateUserRole.mockResolvedValue([] as any);

    const response = await PATCH(makePatchRequest({ role: 'operator' }), { params: makeParams('nonexistent') });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('User not found');
  });

  it('successfully updates user role', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    const updatedUser = { id: 'target-user', email: 'user@test.com', name: 'User', role: 'operator', last_login_at: null, created_at: '2026-01-01' };
    mockUpdateUserRole.mockResolvedValue([updatedUser] as any);

    const response = await PATCH(makePatchRequest({ role: 'operator' }), { params: makeParams() });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.role).toBe('operator');
    expect(mockUpdateUserRole).toHaveBeenCalledWith('target-user', 'operator', 'org-1');
  });
});

describe('DELETE /api/team/members/[userId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await DELETE(makeDeleteRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin tries to delete', async () => {
    mockGetAppSession.mockResolvedValue(viewerSession);
    mockMeetsRoleLevel.mockReturnValue(false);

    const response = await DELETE(makeDeleteRequest(), { params: makeParams() });
    expect(response.status).toBe(403);
  });

  it('returns 400 when trying to remove yourself', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);

    const response = await DELETE(makeDeleteRequest(), { params: makeParams('u1') });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Cannot remove yourself');
  });

  it('returns 404 when user not found or is owner', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockRemoveTeamMember.mockResolvedValue([] as any);

    const response = await DELETE(makeDeleteRequest(), { params: makeParams('nonexistent') });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('User not found or is owner');
  });

  it('successfully removes a team member', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    const removedUser = { id: 'target-user', email: 'user@test.com', name: 'User', role: 'viewer', last_login_at: null, created_at: '2026-01-01' };
    mockRemoveTeamMember.mockResolvedValue([removedUser] as any);

    const response = await DELETE(makeDeleteRequest(), { params: makeParams() });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockRemoveTeamMember).toHaveBeenCalledWith('target-user', 'org-1');
  });
});
