'use client';

import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PlanBadge() {
  const { data: session } = useSession();
  const tier = session?.user?.subscriptionTier || 'free';

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase tracking-wider font-semibold',
        tier === 'enterprise' && 'border-purple-500/50 text-purple-400 bg-purple-500/10',
        tier === 'pro' && 'border-blue-500/50 text-blue-400 bg-blue-500/10',
        tier === 'free' && 'border-muted-foreground/30 text-muted-foreground'
      )}
    >
      {tier}
    </Badge>
  );
}
