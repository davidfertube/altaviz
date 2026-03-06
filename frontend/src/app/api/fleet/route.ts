import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoFleetHealth } from '@/lib/demo-data';

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json(getDemoFleetHealth());
    }
    const { getFleetHealth } = await import('@/lib/queries');
    const { getAppSession } = await import('@/lib/session');
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getFleetHealth(session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch fleet health');
  }
}
