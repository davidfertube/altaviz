import { NextRequest, NextResponse } from 'next/server';
import { getCompressorReadings } from '@/lib/queries';
import { getAppSession } from '@/lib/session';
import { canAccessWindowType } from '@/lib/plans';
import { validateInt, validateEnum } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
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
    const window = validateEnum<WindowType>(searchParams.get('window'), ['1hr', '4hr', '24hr'], '1hr');
    const hours = validateInt(searchParams.get('hours'), { min: 1, max: 168, fallback: 24 });

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
    return handleApiError(error, 'Failed to fetch readings');
  }
}
