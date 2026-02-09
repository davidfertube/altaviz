import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, getActiveAlerts } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const compressor = searchParams.get('compressor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
