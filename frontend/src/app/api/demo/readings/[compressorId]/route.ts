import { NextRequest, NextResponse } from 'next/server';
import { DEMO_READINGS } from '@/lib/demo-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ compressorId: string }> }
) {
  const { compressorId } = await params;
  const readings = DEMO_READINGS[compressorId];

  if (!readings) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  return NextResponse.json(readings);
}
