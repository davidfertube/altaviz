import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoAlerts, getDemoActiveAlerts } from '@/lib/demo-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const compressor = searchParams.get('compressor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (isDemoMode()) {
      if (status === 'active' && !severity && !compressor && offset === 0) {
        return NextResponse.json(getDemoActiveAlerts());
      }
      return NextResponse.json(getDemoAlerts({ status, severity, compressor, limit, offset }));
    }

    const { getAlerts, getActiveAlerts } = await import('@/lib/queries');
    const { getAppSession } = await import('@/lib/session');
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (status === 'active' && !severity && !compressor && offset === 0) {
      const data = await getActiveAlerts(session.organizationId);
      return NextResponse.json(data);
    }

    const data = await getAlerts({
      organizationId: session.organizationId,
      severity,
      status,
      compressor,
      limit,
      offset,
    });
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch alerts');
  }
}
