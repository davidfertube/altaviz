'use client';

import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SafetyWarning } from '@/lib/action-plan-types';

const LEVEL_CONFIG = {
  danger: {
    icon: ShieldAlert,
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  caution: {
    icon: AlertTriangle,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
} as const;

export default function SafetyWarnings({ warnings }: { warnings: SafetyWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-5 text-red-500" />
          Safety First
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((w, i) => {
          const config = LEVEL_CONFIG[w.level];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-l-4',
                config.border,
                config.bg,
              )}
            >
              <Icon className={cn('size-5 shrink-0 mt-0.5', config.iconColor)} />
              <p className={cn('text-sm sm:text-base leading-relaxed', config.text)}>
                {w.message}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
