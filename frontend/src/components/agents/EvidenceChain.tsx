'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EvidenceStep } from '@/lib/types';
import ConfidenceBadge from './ConfidenceBadge';

export default function EvidenceChain({ steps }: { steps: EvidenceStep[] }) {
  if (!steps.length) return null;

  return (
    <div className="relative">
      {steps.map((step, i) => (
        <div key={step.step_number} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {i < steps.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
          )}

          {/* Step indicator */}
          <div className={cn(
            'relative z-10 flex items-center justify-center size-8 rounded-full shrink-0 text-xs font-bold',
            step.supports_hypothesis
              ? 'bg-healthy/10 text-healthy border border-healthy/20'
              : 'bg-critical/10 text-critical border border-critical/20'
          )}>
            {step.step_number}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-muted-foreground font-mono">{step.source}</span>
              <ConfidenceBadge confidence={step.confidence} />
              {step.supports_hypothesis ? (
                <CheckCircle className="size-3.5 text-healthy" />
              ) : (
                <XCircle className="size-3.5 text-critical" />
              )}
            </div>
            <p className="text-sm">{step.finding}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
