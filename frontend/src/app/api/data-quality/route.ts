import { NextRequest, NextResponse } from 'next/server';
import { getDataQualityMetrics } from '@/lib/queries';
import { getAppSession } from '@/lib/session';
import { validateInt } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const compressor = request.nextUrl.searchParams.get('compressor') || undefined;
    const hours = validateInt(request.nextUrl.searchParams.get('hours'), { min: 1, max: 168, fallback: 24 });
    const data = await getDataQualityMetrics({
      organizationId: session.organizationId,
      compressor,
      hours,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch data quality metrics');
  }
}
