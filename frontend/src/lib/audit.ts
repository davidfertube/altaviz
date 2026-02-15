import { query } from './db';

export async function logAuditEvent(params: {
  userId?: string;
  organizationId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, organization_id, action, resource_type, resource_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId || null,
        params.organizationId,
        params.action,
        params.resourceType,
        params.resourceId || null,
        params.ipAddress || null,
        params.details ? JSON.stringify(params.details) : null,
      ]
    );
  } catch {
    // Audit logging should never break the request — fail silently
  }
}
