'use client';

import { use, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useWorkOrder } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import StatusPill from '@/components/agents/StatusPill';
import PriorityBadge from '@/components/agents/PriorityBadge';
import ConfidenceBadge from '@/components/agents/ConfidenceBadge';
import WorkOrderTimeline from '@/components/agents/WorkOrderTimeline';

const TRANSITION_ACTIONS: Record<string, { label: string; toStatus: string; variant: 'default' | 'outline' | 'destructive' }[]> = {
  draft: [{ label: 'Submit for Approval', toStatus: 'pending_approval', variant: 'default' }],
  pending_approval: [
    { label: 'Approve', toStatus: 'approved', variant: 'default' },
    { label: 'Reject', toStatus: 'rejected', variant: 'destructive' },
  ],
  approved: [{ label: 'Assign', toStatus: 'assigned', variant: 'default' }],
  assigned: [{ label: 'Start Work', toStatus: 'in_progress', variant: 'default' }],
  in_progress: [{ label: 'Mark Complete', toStatus: 'completed', variant: 'default' }],
  completed: [{ label: 'Verify', toStatus: 'verified', variant: 'default' }],
};

export default function WorkOrderDetailPage({ params }: { params: Promise<{ woId: string }> }) {
  const { woId } = use(params);
  const { data: wo, isLoading, mutate } = useWorkOrder(woId);
  const [transitioning, setTransitioning] = useState(false);

  async function handleTransition(toStatus: string) {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/agent/work-orders/${woId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus, reason: `Manual transition to ${toStatus}` }),
      });
      if (res.ok) mutate();
    } finally {
      setTransitioning(false);
    }
  }

  const actions = wo ? TRANSITION_ACTIONS[wo.status] || [] : [];

  return (
    <div className="min-h-screen">
      <Header title="Work Order Detail" subtitle={woId} />

      <div className="p-4 sm:p-6 space-y-6">
        <Link href="/dashboard/work-orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to work orders
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : wo ? (
          <>
            {/* Summary */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{wo.title}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{wo.compressor_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={wo.status} />
                    <PriorityBadge priority={wo.priority} />
                  </div>
                </div>

                {wo.description && <p className="text-sm text-muted-foreground">{wo.description}</p>}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="capitalize">{wo.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Hours</p>
                    <p>{wo.estimated_hours ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Cost</p>
                    <p>{wo.estimated_cost != null ? `$${wo.estimated_cost.toLocaleString()}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Shutdown Required</p>
                    <p>{wo.requires_shutdown ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {wo.agent_confidence != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">AI Confidence:</span>
                    <ConfidenceBadge confidence={wo.agent_confidence} />
                  </div>
                )}

                {wo.agent_reasoning && (
                  <div className="bg-accent/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
                    <p className="text-sm">{wo.agent_reasoning}</p>
                  </div>
                )}

                {/* Actions */}
                {actions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {actions.map(a => (
                      <Button
                        key={a.toStatus}
                        variant={a.variant}
                        size="sm"
                        onClick={() => handleTransition(a.toStatus)}
                        disabled={transitioning}
                      >
                        {transitioning ? <Loader2 className="size-4 animate-spin" /> : a.label}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => handleTransition('cancelled')} disabled={transitioning}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parts needed */}
            {wo.parts_needed?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Parts Needed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {wo.parts_needed.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                        <div>
                          <span className="font-medium">{p.part_name}</span>
                          {p.part_number && <span className="text-muted-foreground ml-2">({p.part_number})</span>}
                        </div>
                        <div className="text-muted-foreground">
                          x{p.quantity}
                          {p.estimated_cost != null && <span className="ml-2">${p.estimated_cost}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety considerations */}
            {wo.safety_considerations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Safety Considerations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {wo.safety_considerations.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-0.5">&bull;</span> {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkOrderTimeline transitions={wo.timeline || []} />
              </CardContent>
            </Card>

            {/* Completion details */}
            {wo.status === 'completed' || wo.status === 'verified' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Completion Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Hours</p>
                      <p>{wo.actual_hours ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Cost</p>
                      <p>{wo.actual_cost != null ? `$${wo.actual_cost.toLocaleString()}` : 'N/A'}</p>
                    </div>
                  </div>
                  {wo.completion_notes && <p className="text-sm text-muted-foreground mt-2">{wo.completion_notes}</p>}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Work order not found.</p>
        )}
      </div>
    </div>
  );
}
