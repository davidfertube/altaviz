import { NextRequest, NextResponse } from 'next/server';
import { getCompressorReadings } from '@/lib/queries';
import { getAppSession } from '@/lib/session';
import { canAccessWindowType } from '@/lib/plans';
import type { WindowType } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compressorId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { compressorId } = await params;
    const { searchParams } = request.nextUrl;
    const window = (searchParams.get('window') || '1hr') as WindowType;
    const hours = parseInt(searchParams.get('hours') || '24');

    // Feature gate: check if plan allows this window type
    if (!canAccessWindowType(session.subscriptionTier, window)) {
      return NextResponse.json(
        { error: 'Upgrade required', message: `The ${window} window requires a Pro or Enterprise plan` },
        { status: 403 }
      );
    }

    const data = await getCompressorReadings(compressorId, window, hours, session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch readings:', error);
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
  }
}
