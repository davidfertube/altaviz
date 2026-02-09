'use client';

import { useState } from 'react';
import { useAlerts, acknowledgeAlertAction, resolveAlertAction } from '@/hooks/useAlerts';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/cards/MetricCard';
import AlertTable from '@/components/tables/AlertTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState('active');
  const { data: alerts, isLoading, mutate } = useAlerts({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100,
  });

  const activeCount = alerts?.filter(a => !a.resolved).length ?? 0;
  const criticalCount = alerts?.filter(a => a.severity === 'critical' && !a.resolved).length ?? 0;
  const warningCount = alerts?.filter(a => a.severity === 'warning' && !a.resolved).length ?? 0;

  const handleAcknowledge = async (id: number) => {
    await acknowledgeAlertAction(id);
    mutate();
  };

  const handleResolve = async (id: number) => {
    await resolveAlertAction(id);
    mutate();
  };

  return (
    <div className="min-h-screen">
      <Header title="Alerts" subtitle="Threshold violations and anomaly detection" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                label="Active Alerts"
                value={activeCount}
                status={activeCount > 0 ? 'warning' : 'healthy'}
              />
              <MetricCard
                label="Critical"
                value={criticalCount}
                status={criticalCount > 0 ? 'critical' : 'healthy'}
              />
              <MetricCard
                label="Warning"
                value={warningCount}
                status={warningCount > 0 ? 'warning' : 'healthy'}
              />
            </>
          )}
        </div>

        {/* Filter Tabs + Table */}
        <Card className="py-0 gap-0">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList variant="line" className="px-4 sm:px-6 pt-3">
              <TabsTrigger value="active" className="gap-2">
                Active
                {activeCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{activeCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter}>
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading alerts...</div>
              ) : alerts && alerts.length > 0 ? (
                <AlertTable
                  alerts={alerts}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                />
              ) : (
                <EmptyState
                  title="No alerts"
                  message={statusFilter === 'active' ? 'All systems operating normally.' : 'No alerts match the current filter.'}
                />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
