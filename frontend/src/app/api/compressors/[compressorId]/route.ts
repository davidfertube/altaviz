import { NextRequest, NextResponse } from 'next/server';
import { getCompressor, getLatestPrediction } from '@/lib/queries';
import { query } from '@/lib/db';
import { getAppSession } from '@/lib/session';
import type { LatestReading } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ compressorId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { compressorId } = await params;
    if (!/^(COMP|PL)-\d{3}$/.test(compressorId)) {
      return NextResponse.json({ error: 'Invalid pipeline ID format' }, { status: 400 });
    }
    const [metadata] = await getCompressor(compressorId, session.organizationId);
    if (!metadata) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const [readingsResult, predictions] = await Promise.all([
      query<LatestReading>(
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
