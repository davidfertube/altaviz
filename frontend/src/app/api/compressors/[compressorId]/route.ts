import { NextRequest, NextResponse } from 'next/server';
import { getCompressor } from '@/lib/queries';
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
    const [metadata] = await getCompressor(compressorId, session.organizationId);
    if (!metadata) {
      return NextResponse.json({ error: 'Compressor not found' }, { status: 404 });
    }

    const [latestReading] = await query<LatestReading>(
      'SELECT * FROM v_latest_readings WHERE compressor_id = $1 AND organization_id = $2',
      [compressorId, session.organizationId]
    );

    return NextResponse.json({ metadata, latestReading: latestReading || null });
  } catch (error) {
    console.error('Failed to fetch compressor:', error);
    return NextResponse.json({ error: 'Failed to fetch compressor' }, { status: 500 });
  }
}
