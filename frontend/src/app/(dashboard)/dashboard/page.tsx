'use client';

import { useState } from 'react';
import { useFleetHealth, useActiveAlerts } from '@/hooks/useFleetHealth';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/cards/MetricCard';
import PipelineCard from '@/components/cards/PipelineCard';
import FleetMap from '@/components/maps/FleetMap';
import AlertTable from '@/components/tables/AlertTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { COLORS } from '@/lib/constants';
import { X, PlayCircle } from 'lucide-react';
import { useSWRConfig } from 'swr';

function FleetHealthSparkline({ fleet }: { fleet: { compressor_id: string; health_status: string }[] }) {
  // Build a mini sparkline: bar per compressor colored by status
  const statusColor = (s: string) =>
    s === 'critical' ? COLORS.critical : s === 'warning' ? COLORS.warning : COLORS.healthy;

  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Fleet Health by Unit</p>
      <div className="flex items-end gap-1 h-12 sm:h-16">
        {fleet.map((c) => {
          const h = c.health_status === 'healthy' ? 100 : c.health_status === 'warning' ? 60 : 30;
          return (
            <div
              key={c.compressor_id}
              className="flex-1 rounded-t transition-all"
              style={{ height: `${h}%`, backgroundColor: statusColor(c.health_status), opacity: 0.85 }}
              title={`${c.compressor_id}: ${c.health_status}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{fleet[0]?.compressor_id}</span>
        <span className="text-[10px] text-muted-foreground">{fleet[fleet.length - 1]?.compressor_id}</span>
      </div>
    </Card>
  );
}

export default function FleetOverviewPage() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const { data: fleet, isLoading: fleetLoading, mutate: mutateFleet } = useFleetHealth();
  const { data: alerts, isLoading: alertsLoading, mutate: mutateAlerts } = useActiveAlerts();
  const { mutate } = useSWRConfig();

  function enableDemoData() {
    localStorage.setItem('altaviz_demo_mode', '1');
    // Revalidate all SWR caches so data re-fetches with the demo header
    mutateFleet();
    mutateAlerts();
    mutate(() => true, undefined, { revalidate: true });
  }

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
                subtitle="Across all regions"
              />
            </>
          )}
        </div>

        {/* Fleet Health Sparkline */}
        {fleet && fleet.length > 0 && (
          <FleetHealthSparkline fleet={fleet} />
        )}

        {/* Map + Pipeline Grid */}
        {fleet && fleet.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Map */}
            <div className="xl:col-span-2 h-[250px] sm:h-[300px] md:h-[420px]">
              <FleetMap
                fleet={fleet}
                selectedStationId={selectedStationId}
                onStationSelect={setSelectedStationId}
                linkPrefix="/dashboard/monitoring"
              />
            </div>

            {/* Pipeline Grid */}
            <div className="xl:col-span-3">
              {selectedStationId && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-foreground">
                    {fleet.find(c => c.station_id === selectedStationId)?.station_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setSelectedStationId(null)}
                  >
                    Show all compressors
                    <X className="size-3 ml-1" />
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(selectedStationId
                  ? fleet.filter(c => c.station_id === selectedStationId)
                  : fleet
                ).map(c => (
                  <PipelineCard key={c.compressor_id} data={c} />
                ))}
              </div>
            </div>
          </div>
        ) : !fleetLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyState
              title="No compressor data yet"
              message="Load demo data to explore the full dashboard with 10 compressors, alerts, and ML predictions."
            />
            <Button
              onClick={enableDemoData}
              className="mt-4 bg-[#F5C518] text-[#0A0A0A] hover:bg-[#FFD84D] font-semibold px-6 py-2.5"
            >
              <PlayCircle className="size-4 mr-2" />
              Load Demo Data
            </Button>
          </div>
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
