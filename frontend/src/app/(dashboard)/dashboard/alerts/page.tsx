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
import { COLORS } from '@/lib/constants';

function SeverityPieChart({ critical, warning }: { critical: number; warning: number }) {
  const total = critical + warning;
  if (total === 0) return null;

  const critPct = (critical / total) * 100;
  const warnPct = (warning / total) * 100;
  // SVG donut chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const critArc = (critPct / 100) * circumference;
  const warnArc = (warnPct / 100) * circumference;

  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Severity Distribution</p>
      <div className="flex items-center gap-6">
        <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
          {/* Warning arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={COLORS.warning}
            strokeWidth="12"
            strokeDasharray={`${warnArc} ${circumference - warnArc}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          {/* Critical arc on top */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={COLORS.critical}
            strokeWidth="12"
            strokeDasharray={`${critArc} ${circumference - critArc}`}
            strokeDashoffset={-warnArc}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold font-mono">
            {total}
          </text>
        </svg>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.critical }} />
            <span className="text-muted-foreground">Critical</span>
            <span className="font-mono font-semibold ml-auto">{critical}</span>
            <span className="text-xs text-muted-foreground">({critPct.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.warning }} />
            <span className="text-muted-foreground">Warning</span>
            <span className="font-mono font-semibold ml-auto">{warning}</span>
            <span className="text-xs text-muted-foreground">({warnPct.toFixed(0)}%)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
        {/* Summary + Pie Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
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
              <SeverityPieChart critical={criticalCount} warning={warningCount} />
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
