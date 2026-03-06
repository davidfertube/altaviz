import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoPipelineMaintenance } from '@/lib/demo-data';

export async function GET(request: NextRequest) {
  try {
    if (isDemoMode()) {
      const compressor = request.nextUrl.searchParams.get('compressor') || undefined;
      return NextResponse.json(getDemoPipelineMaintenance(compressor));
    }

    const { getMaintenanceEvents } = await import('@/lib/queries');
    const { getAppSession } = await import('@/lib/session');
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
