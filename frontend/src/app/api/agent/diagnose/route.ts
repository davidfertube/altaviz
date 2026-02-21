import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

const COMPRESSOR_ID_REGEX = /^COMP-\d{3}$/;
const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const { compressorId } = await request.json();

    if (!compressorId || !COMPRESSOR_ID_REGEX.test(compressorId)) {
      return NextResponse.json(
        { error: 'Invalid compressor ID format. Expected COMP-XXX' },
        { status: 400 }
      );
    }

    // Proxy to the Python diagnostics agent API
    const response = await fetch(`${AGENT_API_URL}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compressor_id: compressorId }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Agent diagnosis failed: ${error}` },
        { status: response.status }
      );
    }

    const report = await response.json();

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'agent.diagnose',
      resourceType: 'compressor',
      resourceId: compressorId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { severity: report.severity, confidence: report.confidence },
    });

    return NextResponse.json(report);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Compressor diagnosis failed');
  }
}
