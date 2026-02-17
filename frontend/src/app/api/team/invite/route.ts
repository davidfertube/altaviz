import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, meetsRoleLevel } from '@/lib/session';
import { query } from '@/lib/db';

const VALID_ROLES = ['admin', 'operator', 'viewer'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!meetsRoleLevel(session.role, 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, operator, or viewer' }, { status: 400 });
    }

    // Check if user already exists in this org
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
      [email.toLowerCase(), session.organizationId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already in organization' }, { status: 409 });
    }

    // Create a placeholder user that will be activated on first login
    const [user] = await query<{ id: string; email: string; role: string }>(
      `INSERT INTO users (organization_id, email, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET organization_id = $1, role = $3
       RETURNING id, email, role`,
      [session.organizationId, email.toLowerCase(), role]
    );

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
      message: `Invited ${email} as ${role}`,
    });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Failed to invite team member');
  }
}
