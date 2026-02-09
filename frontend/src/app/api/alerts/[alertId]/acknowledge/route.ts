import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeAlert } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}
