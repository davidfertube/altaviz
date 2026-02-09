import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { query } from '@/lib/db';

const TIER_MAP: Record<string, { tier: string; maxCompressors: number }> = {
  [process.env.STRIPE_PRICE_ID_PRO || '']: { tier: 'pro', maxCompressors: 20 },
  [process.env.STRIPE_PRICE_ID_ENTERPRISE || '']: { tier: 'enterprise', maxCompressors: 999999 },
};

async function updateOrgSubscription(
  stripeCustomerId: string,
  tier: string,
  status: string,
  maxCompressors: number
) {
  await query(
    `UPDATE organizations
     SET subscription_tier = $1, subscription_status = $2, max_compressors = $3, updated_at = NOW()
     WHERE stripe_customer_id = $4`,
    [tier, status, maxCompressors, stripeCustomerId]
  );
}

async function logBillingEvent(
  stripeCustomerId: string,
  stripeEventId: string,
  eventType: string,
  amountCents?: number,
  metadata?: Record<string, unknown>
) {
  const orgs = await query<{ id: string }>(
    'SELECT id FROM organizations WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
  if (orgs.length === 0) return;

  await query(
    `INSERT INTO billing_events (organization_id, stripe_event_id, event_type, amount_cents, metadata)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [orgs[0].id, stripeEventId, eventType, amountCents || null, JSON.stringify(metadata || {})]
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id || '';
          const tierInfo = TIER_MAP[priceId] || { tier: 'free', maxCompressors: 2 };

          await updateOrgSubscription(
            session.customer as string,
            tierInfo.tier,
            'active',
            tierInfo.maxCompressors
          );
          await logBillingEvent(
            session.customer as string,
            event.id,
            'checkout_completed',
            session.amount_total || undefined,
            { priceId, tier: tierInfo.tier }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price.id || '';
        const tierInfo = TIER_MAP[priceId] || { tier: 'free', maxCompressors: 2 };
        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : subscription.status === 'trialing' ? 'trialing'
          : 'canceled';

        await updateOrgSubscription(
          subscription.customer as string,
          tierInfo.tier,
          status,
          tierInfo.maxCompressors
        );
        await logBillingEvent(
          subscription.customer as string,
          event.id,
          'subscription_updated',
          undefined,
          { priceId, tier: tierInfo.tier, status }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await updateOrgSubscription(
          subscription.customer as string,
          'free',
          'canceled',
          2
        );
        await logBillingEvent(
          subscription.customer as string,
          event.id,
          'subscription_canceled'
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await updateOrgSubscription(
          invoice.customer as string,
          // Keep current tier but mark as past_due
          'pro', // will be overridden by subscription.updated event
          'past_due',
          20
        );
        await logBillingEvent(
          invoice.customer as string,
          event.id,
          'payment_failed',
          invoice.amount_due || undefined
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
