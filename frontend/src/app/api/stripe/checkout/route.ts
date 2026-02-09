import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { createCheckoutSession } from '@/lib/stripe';
import { getStripePriceId, type SubscriptionTier } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = (await request.json()) as { tier: SubscriptionTier };
    const priceId = getStripePriceId(tier);
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const url = await createCheckoutSession({
      organizationId: session.organizationId,
      email: session.email,
      orgName: session.organizationName,
      priceId,
      returnUrl: `${request.nextUrl.origin}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Stripe checkout error');
  }
}
