/**
 * Tests for alert action routes: acknowledge and resolve.
 *
 * - PATCH /api/alerts/[alertId]/acknowledge
 * - PATCH /api/alerts/[alertId]/resolve
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
  meetsRoleLevel: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  acknowledgeAlert: jest.fn(),
  resolveAlert: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession, meetsRoleLevel } from '../../src/lib/session';
import { acknowledgeAlert, resolveAlert } from '../../src/lib/queries';
import { PATCH as AcknowledgePATCH } from '../../src/app/api/alerts/[alertId]/acknowledge/route';
import { PATCH as ResolvePATCH } from '../../src/app/api/alerts/[alertId]/resolve/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockMeetsRoleLevel = meetsRoleLevel as jest.MockedFunction<typeof meetsRoleLevel>;
const mockAcknowledgeAlert = acknowledgeAlert as jest.MockedFunction<typeof acknowledgeAlert>;
const mockResolveAlert = resolveAlert as jest.MockedFunction<typeof resolveAlert>;

const operatorSession = {
  userId: 'u1',
  email: 'op@test.com',
  name: 'Operator',
  organizationId: 'org-1',
  organizationName: 'TestOrg',
  role: 'operator',
  subscriptionTier: 'pro',
};

const viewerSession = {
  ...operatorSession,
  userId: 'u2',
  role: 'viewer',
  name: 'Viewer',
};

function makeAckRequest(body: object = {}) {
  return new NextRequest('http://localhost:3000/api/alerts/42/acknowledge', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeResolveRequest() {
  return new NextRequest('http://localhost:3000/api/alerts/42/resolve', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
}

const makeParams = (alertId = '42') => Promise.resolve({ alertId });

describe('PATCH /api/alerts/[alertId]/acknowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await AcknowledgePATCH(makeAckRequest(), { params: makeParams() });
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when viewer tries to acknowledge', async () => {
    mockGetAppSession.mockResolvedValue(viewerSession);
    mockMeetsRoleLevel.mockReturnValue(false);

    const response = await AcknowledgePATCH(makeAckRequest(), { params: makeParams() });
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Operator access required');
  });

  it('returns 404 when alert not found', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockAcknowledgeAlert.mockResolvedValue([] as any);

    const response = await AcknowledgePATCH(makeAckRequest(), { params: makeParams('999') });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Alert not found');
  });

  it('successfully acknowledges an alert with custom name', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    const updatedAlert = { id: 42, acknowledged: true, acknowledged_by: 'John Doe', acknowledged_at: '2026-02-16T10:00:00Z' };
    mockAcknowledgeAlert.mockResolvedValue([updatedAlert] as any);

    const response = await AcknowledgePATCH(
      makeAckRequest({ acknowledged_by: 'John Doe' }),
      { params: makeParams() }
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.acknowledged).toBe(true);
    expect(body.acknowledged_by).toBe('John Doe');
    expect(mockAcknowledgeAlert).toHaveBeenCalledWith(42, 'John Doe', 'org-1');
  });

  it('falls back to session name when acknowledged_by not provided', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    const updatedAlert = { id: 42, acknowledged: true, acknowledged_by: 'Operator' };
    mockAcknowledgeAlert.mockResolvedValue([updatedAlert] as any);

    const response = await AcknowledgePATCH(makeAckRequest({}), { params: makeParams() });
    expect(response.status).toBe(200);
    expect(mockAcknowledgeAlert).toHaveBeenCalledWith(42, 'Operator', 'org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockAcknowledgeAlert.mockRejectedValue(new Error('DB error'));

    const response = await AcknowledgePATCH(makeAckRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/alerts/[alertId]/resolve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await ResolvePATCH(makeResolveRequest(), { params: makeParams() });
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when viewer tries to resolve', async () => {
    mockGetAppSession.mockResolvedValue(viewerSession);
    mockMeetsRoleLevel.mockReturnValue(false);

    const response = await ResolvePATCH(makeResolveRequest(), { params: makeParams() });
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Operator access required');
  });

  it('returns 404 when alert not found', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockResolveAlert.mockResolvedValue([] as any);

    const response = await ResolvePATCH(makeResolveRequest(), { params: makeParams('999') });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Alert not found');
  });

  it('successfully resolves an alert', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    const updatedAlert = { id: 42, resolved: true, resolved_at: '2026-02-16T10:00:00Z' };
    mockResolveAlert.mockResolvedValue([updatedAlert] as any);

    const response = await ResolvePATCH(makeResolveRequest(), { params: makeParams() });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.resolved).toBe(true);
    expect(mockResolveAlert).toHaveBeenCalledWith(42, 'org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(operatorSession);
    mockMeetsRoleLevel.mockReturnValue(true);
    mockResolveAlert.mockRejectedValue(new Error('DB error'));

    const response = await ResolvePATCH(makeResolveRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
  });
});
