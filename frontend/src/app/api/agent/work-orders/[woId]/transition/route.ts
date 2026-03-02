import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

const VALID_STATUSES = [
  'pending_approval', 'approved', 'rejected', 'assigned',
  'in_progress', 'completed', 'verified', 'cancelled',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ woId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { toStatus, reason, assignedTo, actualHours, actualCost, completionNotes } = body;

    // Approval/rejection requires admin; other transitions require operator
    const requiresAdmin = ['approved', 'rejected', 'cancelled'].includes(toStatus);
    const requiredRole = requiresAdmin ? 'admin' : 'operator';
    if (!meetsRoleLevel(session.role, requiredRole)) {
      return NextResponse.json({ error: `${requiredRole} access required` }, { status: 403 });
    }

    if (!toStatus || !VALID_STATUSES.includes(toStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const { woId } = await params;

    const response = await fetch(`${AGENT_API_URL}/work-orders/${woId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_order_id: woId,
        to_status: toStatus,
        reason: reason || `Transitioned by ${session.userId}`,
        changed_by: session.userId,
        assigned_to: assignedTo || undefined,
        actual_hours: actualHours || undefined,
        actual_cost: actualCost || undefined,
        completion_notes: completionNotes || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'agent.work_order.transition',
      resourceType: 'work_order',
      resourceId: woId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { toStatus, reason },
    });

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Work order transition failed');
  }
}
