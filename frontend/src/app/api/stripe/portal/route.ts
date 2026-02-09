import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = await createPortalSession(
      session.organizationId,
      session.email,
      session.organizationName,
      `${request.nextUrl.origin}/dashboard/settings/billing`
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
