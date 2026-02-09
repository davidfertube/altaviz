import { NextRequest, NextResponse } from 'next/server';
import { getDataQualityMetrics } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const compressor = request.nextUrl.searchParams.get('compressor') || undefined;
    const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24');
    const data = await getDataQualityMetrics({
      organizationId: session.organizationId,
      compressor,
      hours,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch data quality metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch data quality metrics' }, { status: 500 });
  }
}
