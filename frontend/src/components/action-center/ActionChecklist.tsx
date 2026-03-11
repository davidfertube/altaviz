'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActionStep } from '@/lib/action-plan-types';

const PRIORITY_STYLES: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  immediate: { label: 'Immediate', variant: 'destructive' },
  next_shift: { label: 'Next Shift', variant: 'default' },
  next_maintenance_window: { label: 'Next Window', variant: 'secondary' },
  monitor: { label: 'Monitor', variant: 'outline' },
};

export default function ActionChecklist({ steps }: { steps: ActionStep[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">What To Do</CardTitle>
          <span className="text-xs text-muted-foreground">
            {checked.size}/{steps.length} completed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step) => {
            const done = checked.has(step.id);
            const pStyle = PRIORITY_STYLES[step.priority] ?? PRIORITY_STYLES.monitor;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 sm:p-4 rounded-lg border text-left transition-colors',
                    done
                      ? 'bg-muted/50 border-border'
                      : 'bg-card hover:bg-accent/50 border-border',
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'flex items-center justify-center shrink-0 w-7 h-7 rounded-md border-2 mt-0.5 transition-colors',
                      done
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {done && (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {!done && (
                      <span className="text-xs font-bold text-muted-foreground">{step.order}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-sm sm:text-base font-medium',
                          done && 'line-through text-muted-foreground',
                        )}
                      >
                        {step.instruction}
                      </span>
                      <Badge variant={pStyle.variant} className="text-xs sm:text-[10px] px-1.5 py-0">
                        {pStyle.label}
                      </Badge>
                      {step.requiresShutdown && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          Shutdown
                        </span>
                      )}
                    </div>
                    {step.detail && (
                      <p className={cn('text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed', done && 'line-through')}>
                        {step.detail}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
