import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'viewer')) {
      return NextResponse.json({ error: 'Viewer access required' }, { status: 403 });
    }

    const { invId } = await params;

    const response = await fetch(`${AGENT_API_URL}/investigations/${invId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch investigation');
  }
}
