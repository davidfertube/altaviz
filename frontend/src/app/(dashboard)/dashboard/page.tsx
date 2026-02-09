'use client';

import { useFleetHealth, useActiveAlerts } from '@/hooks/useFleetHealth';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/cards/MetricCard';
import CompressorCard from '@/components/cards/CompressorCard';
import FleetMap from '@/components/maps/FleetMap';
import AlertTable from '@/components/tables/AlertTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

export default function FleetOverviewPage() {
  const { data: fleet, isLoading: fleetLoading } = useFleetHealth();
  const { data: alerts, isLoading: alertsLoading } = useActiveAlerts();

  const totalCompressors = fleet?.length ?? 0;
  const healthyCount = fleet?.filter(c => c.health_status === 'healthy').length ?? 0;
  const activeAlertCount = alerts?.length ?? 0;
  const criticalAlertCount = alerts?.filter(a => a.severity === 'critical').length ?? 0;
  const healthPct = totalCompressors > 0 ? Math.round((healthyCount / totalCompressors) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Header title="Fleet Overview" subtitle="Real-time health monitoring across all stations" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {fleetLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                label="Compressors Online"
                value={totalCompressors}
                subtitle={`${healthyCount} healthy`}
                status="healthy"
              />
              <MetricCard
                label="Active Alerts"
                value={activeAlertCount}
                subtitle={criticalAlertCount > 0 ? `${criticalAlertCount} critical` : 'All clear'}
                status={criticalAlertCount > 0 ? 'critical' : activeAlertCount > 0 ? 'warning' : 'healthy'}
              />
              <MetricCard
                label="Fleet Health"
                value={`${healthPct}%`}
                subtitle={`${healthyCount}/${totalCompressors} healthy`}
                status={healthPct >= 80 ? 'healthy' : healthPct >= 50 ? 'warning' : 'critical'}
              />
              <MetricCard
                label="Stations Active"
                value={new Set(fleet?.map(c => c.station_id)).size}
                subtitle="4 Texas locations"
              />
            </>
          )}
        </div>

        {/* Map + Compressor Grid */}
        {fleet && fleet.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Map */}
            <div className="xl:col-span-2 h-[300px] sm:h-[420px]">
              <FleetMap fleet={fleet} />
            </div>

            {/* Compressor Grid */}
            <div className="xl:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {fleet.map(c => (
                  <CompressorCard key={c.compressor_id} data={c} />
                ))}
              </div>
            </div>
          </div>
        ) : !fleetLoading ? (
          <EmptyState />
        ) : null}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex-row items-center justify-between py-3 px-4 sm:px-6">
            <CardTitle className="text-sm">Recent Alerts</CardTitle>
            <Button variant="link" size="sm" asChild className="text-primary p-0 h-auto">
              <Link href="/dashboard/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {alertsLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading alerts...</div>
            ) : alerts && alerts.length > 0 ? (
              <AlertTable alerts={alerts.slice(0, 10)} compact />
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">No active alerts</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
