import { NextResponse } from 'next/server';
import { getFleetHealth } from '@/lib/queries';
import { getAppSession } from '@/lib/session';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getFleetHealth(session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch fleet health');
  }
}
