import { NextRequest, NextResponse } from 'next/server';
import { resolveAlert } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await params;
    const [updated] = await resolveAlert(parseInt(alertId), session.organizationId);
    if (!updated) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to resolve alert');
  }
}
