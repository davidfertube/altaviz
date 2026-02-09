import { NextResponse } from 'next/server';
import { getStations } from '@/lib/queries';
import { getAppSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getStations(session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
