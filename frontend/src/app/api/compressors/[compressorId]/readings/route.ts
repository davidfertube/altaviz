import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoPipelineReadings } from '@/lib/demo-data';
import type { WindowType } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compressorId: string }> }
) {
  try {
    const { compressorId } = await params;
    const { searchParams } = request.nextUrl;
    const windowParam = searchParams.get('window') || '1hr';
    const window = (['1hr', '4hr', '24hr'].includes(windowParam) ? windowParam : '1hr') as WindowType;
    const hours = Math.min(Math.max(parseInt(searchParams.get('hours') || '24', 10) || 24, 1), 168);

    if (isDemoMode()) {
      return NextResponse.json(getDemoPipelineReadings(compressorId, window, hours));
    }

    const { getCompressorReadings } = await import('@/lib/queries');
    const { getAppSession } = await import('@/lib/session');
    const { canAccessWindowType } = await import('@/lib/plans');
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessWindowType(session.subscriptionTier, window)) {
      return NextResponse.json(
        { error: 'Upgrade required', message: `The ${window} window requires a Pro or Enterprise plan` },
        { status: 403 }
      );
    }

    const data = await getCompressorReadings(compressorId, window, hours, session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch readings');
  }
}
