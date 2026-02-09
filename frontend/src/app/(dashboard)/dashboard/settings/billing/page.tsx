'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { PLANS, type SubscriptionTier } from '@/lib/plans';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const { data: session } = useSession();
  const currentTier = (session?.user?.subscriptionTier || 'free') as SubscriptionTier;
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(tier: SubscriptionTier) {
    setLoading(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
    } finally {
      setLoading(null);
    }
  }

  const tiers: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

  return (
    <div className="min-h-screen">
      <Header title="Billing" subtitle="Manage your subscription and billing" />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
        {/* Current Plan */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold capitalize">{currentTier}</span>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
              {currentTier !== 'free' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={loading === 'portal'}
                >
                  {loading === 'portal' ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : null}
                  Manage Billing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const plan = PLANS[tier];
            const isCurrent = tier === currentTier;
            const isPopular = tier === 'pro';

            return (
              <Card
                key={tier}
                className={cn(
                  'relative',
                  isPopular && 'border-primary shadow-lg',
                  isCurrent && 'ring-2 ring-primary'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="py-5 px-6">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : tier === 'free' ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Forever
                    </Button>
                  ) : (
                    <Button
                      className={cn('w-full', isPopular && 'bg-primary')}
                      onClick={() => handleUpgrade(tier)}
                      disabled={loading !== null}
                    >
                      {loading === tier ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : null}
                      {tiers.indexOf(tier) > tiers.indexOf(currentTier)
                        ? 'Upgrade'
                        : 'Switch'} to {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
