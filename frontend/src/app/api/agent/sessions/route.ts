import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';

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
    if (searchParams.get('agent_type')) params.set('agent_type', searchParams.get('agent_type')!);
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);

    const response = await fetch(`${AGENT_API_URL}/sessions?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to list sessions');
  }
}
