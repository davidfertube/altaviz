'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Target, AlertOctagon, AlertTriangle, Eye, Clock, DollarSign, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActionPlans } from '@/hooks/useActionPlan';
import { formatTimeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ActionPlan } from '@/lib/action-plan-types';

const STATUS_CONFIG = {
  critical: {
    bg: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    icon: AlertOctagon,
    iconColor: 'text-red-500',
    badge: 'destructive' as const,
    label: 'Critical',
  },
  warning: {
    bg: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    badge: 'secondary' as const,
    label: 'Warning',
  },
  monitoring: {
    bg: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
    icon: Eye,
    iconColor: 'text-blue-500',
    badge: 'outline' as const,
    label: 'Monitoring',
  },
};

const PRIORITY_ORDER = { critical: 0, warning: 1, monitoring: 2 };

function ActionPlanCard({ plan }: { plan: ActionPlan }) {
  const config = STATUS_CONFIG[plan.status];
  const Icon = config.icon;

  return (
    <Link href={`/dashboard/action-center/${plan.compressorId}`}>
      <Card className={cn('border-l-4 hover:shadow-md transition-shadow cursor-pointer', config.bg)}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={cn('size-6 shrink-0 mt-0.5', config.iconColor)} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-semibold text-sm">{plan.compressorId}</span>
                  <Badge variant={config.badge}>{config.label}</Badge>
                </div>
                <h3 className="text-sm sm:text-base font-medium leading-snug">{plan.headline}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{plan.model}</span>
                  <span>·</span>
                  <span>{plan.stationName}</span>
                  {plan.estimatedHours != null && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {plan.estimatedHours}h
                      </span>
                    </>
                  )}
                  {plan.estimatedCost != null && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3" />
                        ${plan.estimatedCost.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(plan.createdAt)}</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ActionCenterPage() {
  const { data: plans, isLoading } = useActionPlans();

  const sorted = plans
    ? [...plans].sort((a, b) => PRIORITY_ORDER[a.status] - PRIORITY_ORDER[b.status])
    : [];

  return (
    <>
      <Header title="Action Center" subtitle="Actionable guidance for field operators" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <span className="text-sm font-medium">
              {sorted.length} compressor{sorted.length !== 1 ? 's' : ''} need attention
            </span>
          </div>
          {sorted.filter((p) => p.status === 'critical').length > 0 && (
            <Badge variant="destructive">
              {sorted.filter((p) => p.status === 'critical').length} Critical
            </Badge>
          )}
          {sorted.filter((p) => p.status === 'warning').length > 0 && (
            <Badge variant="secondary">
              {sorted.filter((p) => p.status === 'warning').length} Warning
            </Badge>
          )}
        </div>

        {/* Plan cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-28 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No action plans active. All compressors operating normally.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((plan) => (
              <ActionPlanCard key={plan.compressorId} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
