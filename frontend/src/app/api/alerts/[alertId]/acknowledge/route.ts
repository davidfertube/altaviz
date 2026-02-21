import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeAlert } from '@/lib/queries';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const { alertId } = await params;
    const body = await request.json();
    const acknowledgedBy = body.acknowledged_by || session.name || 'operator';
    const [updated] = await acknowledgeAlert(
      parseInt(alertId),
      acknowledgedBy,
      session.organizationId
    );
    if (!updated) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'alert.acknowledge',
      resourceType: 'alert',
      resourceId: alertId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { acknowledgedBy, severity: updated.severity },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to acknowledge alert');
  }
}
