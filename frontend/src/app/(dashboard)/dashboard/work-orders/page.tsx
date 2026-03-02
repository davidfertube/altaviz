'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useWorkOrders } from '@/hooks/useAgents';
import { Button } from '@/components/ui/button';
import WorkOrderCard from '@/components/agents/WorkOrderCard';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkOrderStatus, WorkOrder } from '@/lib/types';

const KANBAN_COLUMNS: { label: string; statuses: WorkOrderStatus[] }[] = [
  { label: 'Pending', statuses: ['draft', 'pending_approval'] },
  { label: 'Approved', statuses: ['approved', 'assigned'] },
  { label: 'In Progress', statuses: ['in_progress'] },
  { label: 'Completed', statuses: ['completed', 'verified'] },
  { label: 'Closed', statuses: ['rejected', 'cancelled'] },
];

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const { data: workOrders, isLoading } = useWorkOrders({ status: statusFilter });

  function getColumnOrders(statuses: WorkOrderStatus[]): WorkOrder[] {
    return (workOrders || []).filter(wo => statuses.includes(wo.status));
  }

  return (
    <div className="min-h-screen">
      <Header title="Work Orders" subtitle="AI-generated maintenance work orders" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* View toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setView('kanban'); setStatusFilter(undefined); }}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : view === 'kanban' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {KANBAN_COLUMNS.map(col => {
              const orders = getColumnOrders(col.statuses);
              return (
                <div key={col.label} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</h3>
                    <span className="text-xs text-muted-foreground bg-accent rounded-full px-2 py-0.5">{orders.length}</span>
                  </div>
                  <div className="space-y-3">
                    {orders.map(wo => (
                      <WorkOrderCard key={wo.id} wo={wo} />
                    ))}
                    {orders.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                        No work orders
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : workOrders && workOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {workOrders.map(wo => (
              <WorkOrderCard key={wo.id} wo={wo} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No work orders yet"
            message="Work orders are created automatically by the AI agents when issues are detected."
          />
        )}
      </div>
    </div>
  );
}
