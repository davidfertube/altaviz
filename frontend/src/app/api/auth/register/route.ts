import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const orgSlug = normalizedEmail.split('@')[0].replace(/[^a-z0-9-]/g, '-');
    const orgName = company?.trim() || (name ? `${name}'s Organization` : `${orgSlug} org`);
    const uniqueSlug = orgSlug + '-' + Date.now().toString(36);

    const orgs = await query<{ id: string }>(
      `INSERT INTO organizations (name, slug, subscription_tier, max_compressors)
       VALUES ($1, $2, 'free', 2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [orgName, uniqueSlug]
    );

    await query(
      `INSERT INTO users (organization_id, email, name, password_hash, role, last_login_at)
       VALUES ($1, $2, $3, $4, 'owner', NOW())`,
      [orgs[0].id, normalizedEmail, name || null, passwordHash]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Registration failed');
  }
}
