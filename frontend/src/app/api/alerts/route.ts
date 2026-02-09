import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, getActiveAlerts } from '@/lib/queries';
import { getAppSession } from '@/lib/session';
import { validateInt, validateEnum } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = validateEnum(searchParams.get('status'), ['active', 'resolved'], undefined as unknown as string) || undefined;
    const severity = validateEnum(searchParams.get('severity'), ['warning', 'critical'], undefined as unknown as string) || undefined;
    const compressor = searchParams.get('compressor') || undefined;
    const limit = validateInt(searchParams.get('limit'), { min: 1, max: 200, fallback: 50 });
    const offset = validateInt(searchParams.get('offset'), { min: 0, max: 100000, fallback: 0 });

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
    return handleApiError(error, 'Failed to fetch alerts');
  }
}
