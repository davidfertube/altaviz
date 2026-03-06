import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoDataQuality } from '@/lib/demo-data';

export async function GET(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json(getDemoDataQuality());
    }

    const { getDataQualityMetrics } = await import('@/lib/queries');
    const { getAppSession } = await import('@/lib/session');
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const compressor = request.nextUrl.searchParams.get('compressor') || undefined;
    const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24', 10) || 24;
    const data = await getDataQualityMetrics({
      organizationId: session.organizationId,
      compressor,
      hours,
    });
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch data quality metrics');
  }
}
