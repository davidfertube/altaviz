import Stripe from 'stripe';
import { query } from './db';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return _stripe;
}

export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  orgName: string
): Promise<string> {
  // Check if org already has a Stripe customer
  const orgs = await query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM organizations WHERE id = $1',
    [organizationId]
  );

  if (orgs[0]?.stripe_customer_id) {
    return orgs[0].stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    name: orgName,
    metadata: { organizationId },
  });

  // Save customer ID to org
  await query(
    'UPDATE organizations SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
    [customer.id, organizationId]
  );

  return customer.id;
}

export async function createCheckoutSession(params: {
  organizationId: string;
  email: string;
  orgName: string;
  priceId: string;
  returnUrl: string;
}): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(
    params.organizationId,
    params.email,
    params.orgName
  );

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${params.returnUrl}?success=true`,
    cancel_url: `${params.returnUrl}?canceled=true`,
    metadata: { organizationId: params.organizationId },
  });

  return session.url!;
}

export async function createPortalSession(
  organizationId: string,
  email: string,
  orgName: string,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(organizationId, email, orgName);

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function getSubscription(
  organizationId: string
): Promise<Stripe.Subscription | null> {
  const orgs = await query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM organizations WHERE id = $1',
    [organizationId]
  );

  if (!orgs[0]?.stripe_customer_id) return null;

  const subscriptions = await getStripe().subscriptions.list({
    customer: orgs[0].stripe_customer_id,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data[0] || null;
}
