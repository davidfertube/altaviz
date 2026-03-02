import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const body = await request.json();
    const { scenarioType, targetCompressorIds, parameters } = body;

    if (!scenarioType || !targetCompressorIds?.length) {
      return NextResponse.json({ error: 'scenarioType and targetCompressorIds required' }, { status: 400 });
    }

    const response = await fetch(`${AGENT_API_URL}/optimization/what-if`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_type: scenarioType,
        target_compressor_ids: targetCompressorIds,
        parameters: parameters || {},
        organization_id: session.organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'What-if simulation failed');
  }
}
