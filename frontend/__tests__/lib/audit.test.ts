/**
 * Tests for audit logging utility.
 */

jest.mock('../../src/lib/db', () => ({
  query: jest.fn(),
}));

import { logAuditEvent } from '@/lib/audit';
import { query } from '@/lib/db';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('logAuditEvent', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('inserts audit log with all fields', async () => {
    mockQuery.mockResolvedValue([]);

    await logAuditEvent({
      userId: 'user-1',
      organizationId: 'org-1',
      action: 'team.invite',
      resourceType: 'user',
      resourceId: 'user-2',
      ipAddress: '192.168.1.1',
      details: { role: 'viewer' },
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      [
        'user-1',
        'org-1',
        'team.invite',
        'user',
        'user-2',
        '192.168.1.1',
        JSON.stringify({ role: 'viewer' }),
      ]
    );
  });

  it('handles null optional fields', async () => {
    mockQuery.mockResolvedValue([]);

    await logAuditEvent({
      organizationId: 'org-1',
      action: 'session.login',
      resourceType: 'session',
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      [null, 'org-1', 'session.login', 'session', null, null, null]
    );
  });

  it('silently fails on database error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));

    // Should not throw
    await expect(
      logAuditEvent({
        organizationId: 'org-1',
        action: 'test.action',
        resourceType: 'test',
      })
    ).resolves.toBeUndefined();
  });
});
