import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${AGENT_API_URL}/optimization/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: session.organizationId,
        user_id: session.userId,
        scan_type: body.scanType || 'full',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Fleet scan failed: ${error}` }, { status: response.status });
    }

    const result = await response.json();

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'agent.optimization.scan',
      resourceType: 'fleet',
      resourceId: session.organizationId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { scanType: body.scanType || 'full' },
    });

    return NextResponse.json(result);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Fleet scan failed');
  }
}
