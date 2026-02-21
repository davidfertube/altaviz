import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { updateUserRole, removeTeamMember } from '@/lib/queries';
import { logAuditEvent } from '@/lib/audit';

const VALID_ROLES = ['admin', 'operator', 'viewer'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!meetsRoleLevel(session.role, 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    const { role } = await request.json();

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const [updated] = await updateUserRole(userId, role, session.organizationId);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'team.update_role',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { newRole: role },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to update user role');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!meetsRoleLevel(session.role, 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;

    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const [removed] = await removeTeamMember(userId, session.organizationId);
    if (!removed) {
      return NextResponse.json({ error: 'User not found or is owner' }, { status: 404 });
    }

    logAuditEvent({
      userId: session.userId,
      organizationId: session.organizationId,
      action: 'team.remove',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to remove team member');
  }
}
