'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useCompressorDetail,
  useCompressorReadings,
  useCompressorAlerts,
  useCompressorMaintenance,
} from '@/hooks/useCompressorReadings';
import Header from '@/components/layout/Header';
import GaugeChart from '@/components/charts/GaugeChart';
import TrendChart from '@/components/charts/TrendChart';
import AlertTable from '@/components/tables/AlertTable';
import MaintenanceTable from '@/components/tables/MaintenanceTable';
import TimeRangeSelector from '@/components/filters/TimeRangeSelector';
import WindowTypeToggle from '@/components/filters/WindowTypeToggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/indicators/StatusBadge';
import { MetricCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { SENSOR_THRESHOLDS, COLORS } from '@/lib/constants';
import { timeRangeToHours, formatTimestamp } from '@/lib/utils';
import type { WindowType, TimeRange, HealthStatus } from '@/lib/types';

export default function CompressorDetailPage() {
  const { compressorId } = useParams<{ compressorId: string }>();
  const [windowType, setWindowType] = useState<WindowType>('1hr');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const hours = timeRangeToHours(timeRange);
  const { data: detail, isLoading: detailLoading } = useCompressorDetail(compressorId);
  const { data: readings, isLoading: readingsLoading } = useCompressorReadings(compressorId, windowType, hours);
  const { data: alerts } = useCompressorAlerts(compressorId);
  const { data: maintenance } = useCompressorMaintenance(compressorId);

  const latest = detail?.latestReading;

  let healthStatus: HealthStatus = 'healthy';
  if (alerts && alerts.some(a => a.severity === 'critical' && !a.resolved)) healthStatus = 'critical';
  else if (alerts && alerts.some(a => a.severity === 'warning' && !a.resolved)) healthStatus = 'warning';

  return (
    <div className="min-h-screen">
      <Header
        title={compressorId}
        subtitle={detailLoading ? 'Loading...' : `${detail?.metadata.model} at ${detail?.metadata.station_name}`}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Compressor Info Bar */}
        {detail && (
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <StatusBadge status={healthStatus} size="md" />
            <span className="text-sm text-muted-foreground">Model: <span className="text-foreground font-medium">{detail.metadata.model}</span></span>
            <span className="text-sm text-muted-foreground hidden sm:inline">HP: <span className="text-foreground font-mono">{detail.metadata.horsepower}</span></span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Station: <span className="text-foreground font-medium">{detail.metadata.station_name}</span></span>
            {latest && (
              <span className="text-sm text-muted-foreground hidden md:inline">Last: <span className="text-foreground font-mono">{formatTimestamp(latest.agg_timestamp)}</span></span>
            )}
          </div>
        )}

        {/* Gauge Row */}
        {detailLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <GaugeChart
              value={latest?.vibration_mean ?? null}
              min={0}
              max={12}
              warningThreshold={SENSOR_THRESHOLDS.vibration_mms.warning}
              criticalThreshold={SENSOR_THRESHOLDS.vibration_mms.critical}
              label={SENSOR_THRESHOLDS.vibration_mms.label}
              unit={SENSOR_THRESHOLDS.vibration_mms.unit}
            />
            <GaugeChart
              value={latest?.discharge_temp_mean ?? null}
              min={100}
              max={300}
              warningThreshold={SENSOR_THRESHOLDS.discharge_temp_f.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_temp_f.critical}
              label={SENSOR_THRESHOLDS.discharge_temp_f.label}
              unit={SENSOR_THRESHOLDS.discharge_temp_f.unit}
            />
            <GaugeChart
              value={latest?.suction_pressure_mean ?? null}
              min={0}
              max={100}
              warningThreshold={SENSOR_THRESHOLDS.suction_pressure_psi.warning_low}
              criticalThreshold={SENSOR_THRESHOLDS.suction_pressure_psi.critical_low}
              label={SENSOR_THRESHOLDS.suction_pressure_psi.label}
              unit={SENSOR_THRESHOLDS.suction_pressure_psi.unit}
              inverted
            />
            <GaugeChart
              value={latest?.discharge_pressure_mean ?? null}
              min={700}
              max={1600}
              warningThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.critical}
              label={SENSOR_THRESHOLDS.discharge_pressure_psi.label}
              unit={SENSOR_THRESHOLDS.discharge_pressure_psi.unit}
            />
          </div>
        )}

        {/* Time-Series Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <WindowTypeToggle value={windowType} onChange={setWindowType} />
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Trend Charts */}
        {readingsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : readings && readings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={readings}
              sensorKey="vibration_mean"
              label="Vibration"
              unit="mm/s"
              warningThreshold={SENSOR_THRESHOLDS.vibration_mms.warning}
              criticalThreshold={SENSOR_THRESHOLDS.vibration_mms.critical}
              color={COLORS.primary}
            />
            <TrendChart
              data={readings}
              sensorKey="discharge_temp_mean"
              label="Discharge Temperature"
              unit={SENSOR_THRESHOLDS.discharge_temp_f.unit}
              warningThreshold={SENSOR_THRESHOLDS.discharge_temp_f.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_temp_f.critical}
              color={COLORS.warning}
            />
            <TrendChart
              data={readings}
              sensorKey="suction_pressure_mean"
              label="Suction Pressure"
              unit="PSI"
              color={COLORS.healthy}
            />
            <TrendChart
              data={readings}
              sensorKey="discharge_pressure_mean"
              label="Discharge Pressure"
              unit="PSI"
              warningThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.critical}
              color={COLORS.critical}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">No readings for selected time range</div>
        )}

        {/* Alert & Maintenance History */}
        <Card className="py-0 gap-0">
          <Tabs defaultValue="alerts">
            <TabsList variant="line" className="px-4 sm:px-6 pt-3">
              <TabsTrigger value="alerts" className="gap-2">
                Alerts
                {alerts && alerts.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{alerts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                Maintenance
                {maintenance && maintenance.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{maintenance.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="alerts">
              <AlertTable alerts={alerts ?? []} compact />
            </TabsContent>
            <TabsContent value="maintenance">
              <MaintenanceTable events={maintenance ?? []} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
