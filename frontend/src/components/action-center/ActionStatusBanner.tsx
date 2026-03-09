'use client';

import { AlertTriangle, AlertOctagon, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionPlan } from '@/lib/action-plan-types';

const STATUS_CONFIG = {
  critical: {
    bg: 'bg-red-600 dark:bg-red-700',
    icon: AlertOctagon,
    label: 'CRITICAL',
    pulse: true,
  },
  warning: {
    bg: 'bg-amber-500 dark:bg-amber-600',
    icon: AlertTriangle,
    label: 'WARNING',
    pulse: false,
  },
  monitoring: {
    bg: 'bg-blue-500 dark:bg-blue-600',
    icon: Eye,
    label: 'MONITORING',
    pulse: false,
  },
} as const;

export default function ActionStatusBanner({ plan }: { plan: ActionPlan }) {
  const config = STATUS_CONFIG[plan.status];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-xl p-5 sm:p-6 text-white', config.bg)}>
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {config.pulse && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          )}
          <Icon className="size-8 sm:size-10" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-90">
            {config.label}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 leading-tight">
            {plan.headline}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm opacity-90">
            <span className="font-mono font-semibold">{plan.compressorId}</span>
            <span>·</span>
            <span>{plan.model}</span>
            <span>·</span>
            <span>{plan.stationName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
