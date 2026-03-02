'use client';

import { cn } from '@/lib/utils';
import StatusPill from './StatusPill';

interface Transition {
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export default function WorkOrderTimeline({ transitions }: { transitions: Transition[] }) {
  if (!transitions.length) return <p className="text-sm text-muted-foreground">No transitions yet.</p>;

  return (
    <div className="relative">
      {transitions.map((t, i) => (
        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {i < transitions.length - 1 && (
            <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
          )}

          <div className={cn(
            'relative z-10 size-4 rounded-full shrink-0 mt-0.5 border-2',
            i === transitions.length - 1 ? 'bg-primary border-primary' : 'bg-card border-border'
          )} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={t.to_status} />
              <span className="text-xs text-muted-foreground">
                {new Date(t.created_at).toLocaleString()}
              </span>
            </div>
            {t.reason && <p className="text-xs text-muted-foreground mt-1">{t.reason}</p>}
            {t.changed_by && <p className="text-xs text-muted-foreground">by {t.changed_by}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
