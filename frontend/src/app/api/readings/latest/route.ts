import { NextResponse } from 'next/server';
import { getLatestReadings } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getLatestReadings(session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch latest readings');
  }
}
