'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getPlan } from '@/lib/plans';

interface UpgradePromptProps {
  feature: string;
  requiredTier: 'pro' | 'enterprise';
}

export default function UpgradePrompt({ feature, requiredTier }: UpgradePromptProps) {
  const { data: session } = useSession();
  const currentTier = session?.user?.subscriptionTier || 'free';
  const targetPlan = getPlan(requiredTier);

  if (currentTier === 'enterprise' || (currentTier === 'pro' && requiredTier === 'pro')) {
    return null;
  }

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            Upgrade to {targetPlan.name} to access {feature}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Starting at ${targetPlan.price}/month
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          Upgrade
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
