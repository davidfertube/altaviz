'use client';

import { Search, Wrench, TrendingUp, Stethoscope, Loader2 } from 'lucide-react';
import { useAgentSessions } from '@/hooks/useAgents';
import type { AgentType } from '@/lib/types';

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  diagnostics: <Stethoscope className="size-3.5" />,
  investigation: <Search className="size-3.5" />,
  work_order: <Wrench className="size-3.5" />,
  optimization: <TrendingUp className="size-3.5" />,
};

const AGENT_LABELS: Record<AgentType, string> = {
  diagnostics: 'Diagnostics',
  investigation: 'Investigation',
  work_order: 'Work Order',
  optimization: 'Optimization',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AgentActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data: sessions, isLoading } = useAgentSessions({ limit });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessions?.length) {
    return <p className="text-xs text-muted-foreground text-center py-4">No recent agent activity.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <div key={s.session_id} className="flex items-center gap-3 py-2 px-1 border-b border-border last:border-0">
          <div className="size-7 rounded-full bg-accent flex items-center justify-center shrink-0">
            {AGENT_ICONS[s.agent_type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {AGENT_LABELS[s.agent_type]}
              {s.compressor_id && <span className="text-muted-foreground"> &middot; {s.compressor_id}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.status === 'running' ? (
                <span className="text-primary">Running...</span>
              ) : (
                <>
                  {s.status} &middot; {s.duration_seconds.toFixed(1)}s
                  {s.total_tokens > 0 && <> &middot; {s.total_tokens.toLocaleString()} tokens</>}
                </>
              )}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(s.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
