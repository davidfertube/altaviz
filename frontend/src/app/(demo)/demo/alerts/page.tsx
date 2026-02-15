'use client';

import useSWR from 'swr';
import Header from '@/components/layout/Header';
import AlertTable from '@/components/tables/AlertTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MetricCard from '@/components/cards/MetricCard';
import type { ActiveAlert } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DemoAlertsPage() {
  const { data: alerts, isLoading } = useSWR<ActiveAlert[]>('/api/demo/alerts', fetcher, { refreshInterval: 30000 });

  const criticalCount = alerts?.filter(a => a.severity === 'critical').length ?? 0;
  const warningCount = alerts?.filter(a => a.severity === 'warning').length ?? 0;
  const unacknowledged = alerts?.filter(a => !a.acknowledged).length ?? 0;

  return (
    <div className="min-h-screen">
      <Header title="Alert Management" subtitle="Monitor and respond to pipeline alerts" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard label="Total Active" value={alerts?.length ?? 0} subtitle="Across fleet" />
          <MetricCard label="Critical" value={criticalCount} subtitle="Immediate action" status="critical" />
          <MetricCard label="Warnings" value={warningCount} subtitle="Monitor closely" status="warning" />
          <MetricCard label="Unacknowledged" value={unacknowledged} subtitle="Needs attention" status={unacknowledged > 0 ? 'warning' : 'healthy'} />
        </div>

        <Card>
          <CardHeader className="py-3 px-4 sm:px-6">
            <CardTitle className="text-sm">All Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading alerts...</div>
            ) : alerts && alerts.length > 0 ? (
              <AlertTable alerts={alerts} />
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">No active alerts</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
