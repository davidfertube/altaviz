import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoPipelineDetail } from '@/lib/demo-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compressorId: string }> }
) {
  try {
    const { compressorId } = await params;

    if (isDemoMode(request)) {
      const detail = getDemoPipelineDetail(compressorId);
      if (!detail) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      return NextResponse.json(detail);
    }

    const { getCompressor, getLatestPrediction } = await import('@/lib/queries');
    const { query } = await import('@/lib/db');
    const { getAppSession } = await import('@/lib/session');
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!/^(COMP|PL|PIPE)-\d{3}$/.test(compressorId)) {
      return NextResponse.json({ error: 'Invalid pipeline ID format' }, { status: 400 });
    }
    const [metadata] = await getCompressor(compressorId, session.organizationId);
    if (!metadata) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const [readingsResult, predictions] = await Promise.all([
      query(
        'SELECT * FROM v_latest_readings WHERE compressor_id = $1 AND organization_id = $2',
        [compressorId, session.organizationId]
      ),
      getLatestPrediction(compressorId, session.organizationId),
    ]);

    return NextResponse.json({
      metadata,
      latestReading: readingsResult[0] || null,
      prediction: predictions[0] || null,
    });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch pipeline');
  }
}
