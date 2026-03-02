'use client';

import Link from 'next/link';
import { Clock, DollarSign, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkOrder } from '@/lib/types';
import StatusPill from './StatusPill';
import PriorityBadge from './PriorityBadge';
import ConfidenceBadge from './ConfidenceBadge';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function WorkOrderCard({ wo }: { wo: WorkOrder }) {
  return (
    <Link href={`/dashboard/work-orders/${wo.id}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium truncate">{wo.title}</CardTitle>
            <StatusPill status={wo.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={wo.priority} />
            <span className="text-xs text-muted-foreground font-mono">{wo.compressor_id}</span>
            {wo.agent_confidence != null && <ConfidenceBadge confidence={wo.agent_confidence} />}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {wo.estimated_hours != null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {wo.estimated_hours}h
              </span>
            )}
            {wo.estimated_cost != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="size-3" />
                ${wo.estimated_cost.toLocaleString()}
              </span>
            )}
            {wo.requires_shutdown && (
              <span className="flex items-center gap-1 text-warning">
                <Wrench className="size-3" />
                Shutdown
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
