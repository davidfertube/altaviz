import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceEvents } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const compressor = request.nextUrl.searchParams.get('compressor') || undefined;
    const data = await getMaintenanceEvents(session.organizationId, compressor);
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch maintenance events');
  }
}
