import { NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { getTeamMembers } from '@/lib/queries';

export async function GET() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await getTeamMembers(session.organizationId);
    return NextResponse.json(members);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to fetch team members');
  }
}
