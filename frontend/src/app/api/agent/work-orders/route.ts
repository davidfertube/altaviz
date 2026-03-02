import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'viewer')) {
      return NextResponse.json({ error: 'Viewer access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    params.set('organization_id', session.organizationId);
    if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
    if (searchParams.get('priority')) params.set('priority', searchParams.get('priority')!);
    if (searchParams.get('compressor_id')) params.set('compressor_id', searchParams.get('compressor_id')!);

    const response = await fetch(`${AGENT_API_URL}/work-orders?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to list work orders');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const body = await request.json();
    const { compressorId, context } = body;

    if (!compressorId || !/^COMP-\d{3,5}$/.test(compressorId)) {
      return NextResponse.json({ error: 'Invalid compressor ID format' }, { status: 400 });
    }

    const response = await fetch(`${AGENT_API_URL}/work-orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compressor_id: compressorId,
        organization_id: session.organizationId,
        user_id: session.userId,
        context: context || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Work order creation failed: ${error}` }, { status: response.status });
    }

    const result = await response.json();

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'agent.work_order.create',
      resourceType: 'work_order',
      resourceId: result.id || result.work_order_id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { compressorId, priority: result.priority },
    });

    return NextResponse.json(result);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Work order creation failed');
  }
}
