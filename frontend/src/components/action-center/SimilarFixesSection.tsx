'use client';

import { History, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SimilarFix } from '@/lib/action-plan-types';

const OUTCOME_CONFIG = {
  successful: { label: 'Successful', icon: CheckCircle2, variant: 'outline' as const, className: 'text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700' },
  partial: { label: 'Partial', icon: AlertCircle, variant: 'outline' as const, className: 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700' },
  failed: { label: 'Failed', icon: XCircle, variant: 'outline' as const, className: 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700' },
};

export default function SimilarFixesSection({ fixes }: { fixes: SimilarFix[] }) {
  if (fixes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-5 text-muted-foreground" />
          Similar Past Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fixes.map((fix, i) => {
          const outcome = OUTCOME_CONFIG[fix.outcome];
          const OutcomeIcon = outcome.icon;
          return (
            <div key={i} className="border rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-medium">{fix.compressorId}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{fix.model}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{fix.date}</span>
                </div>
                <Badge variant={outcome.variant} className={outcome.className}>
                  <OutcomeIcon className="size-3 mr-1" />
                  {outcome.label}
                </Badge>
              </div>
              <p className="text-sm font-medium">{fix.issue}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{fix.resolution}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
