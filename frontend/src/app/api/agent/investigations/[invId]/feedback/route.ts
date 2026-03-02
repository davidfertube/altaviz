import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { logAuditEvent } from '@/lib/audit';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!meetsRoleLevel(session.role, 'operator')) {
      return NextResponse.json({ error: 'Operator access required' }, { status: 403 });
    }

    const { invId } = await params;
    const body = await request.json();
    const { rating, wasCorrect, feedback, actualRootCause } = body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const response = await fetch(`${AGENT_API_URL}/investigations/${invId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investigation_id: invId,
        feedback_rating: rating,
        was_correct: wasCorrect,
        technician_feedback: feedback,
        actual_root_cause: actualRootCause || null,
        organization_id: session.organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'agent.investigation.feedback',
      resourceType: 'investigation',
      resourceId: invId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { rating, wasCorrect },
    });

    return NextResponse.json(await response.json());
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to submit feedback');
  }
}
