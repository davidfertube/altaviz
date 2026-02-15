'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  usePipelineDetail,
  usePipelineReadings,
  usePipelineAlerts,
  usePipelineMaintenance,
} from '@/hooks/usePipelineReadings';
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
import type { WindowType, TimeRange, HealthStatus, MlPrediction } from '@/lib/types';

function RulBadge({ prediction }: { prediction: MlPrediction }) {
  const rulDays = prediction.rul_days != null ? Number(prediction.rul_days) : null;
  const failProb = prediction.failure_probability != null ? Number(prediction.failure_probability) : 0;
  const confidence = prediction.confidence_score != null ? Number(prediction.confidence_score) : 0;

  const isUrgent = rulDays != null && rulDays < 3;
  const isWarning = rulDays != null && rulDays < 7;

  const bgColor = isUrgent ? 'bg-red-500/10 border-red-500/30' : isWarning ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
  const textColor = isUrgent ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

  return (
    <Card className={`p-4 border ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ML Prediction</p>
          <p className={`text-2xl font-bold font-mono ${textColor}`}>
            {rulDays != null ? `${rulDays.toFixed(1)}d` : 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground">Remaining Useful Life</p>
        </div>
        <Badge variant={isUrgent ? 'destructive' : isWarning ? 'secondary' : 'outline'} className="text-xs">
          {prediction.model_version || 'heuristic-v1.0'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Failure Probability</p>
          <p className={`font-mono font-semibold ${failProb > 0.5 ? 'text-red-500' : failProb > 0.2 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {(failProb * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Confidence</p>
          <p className="font-mono font-semibold text-foreground">{(confidence * 100).toFixed(0)}%</p>
        </div>
      </div>
    </Card>
  );
}

function CostSavingsBadge({ prediction }: { prediction: MlPrediction }) {
  const failProb = prediction.failure_probability != null ? Number(prediction.failure_probability) : 0;

  // Unplanned downtime costs ~$15k/hr for gas compression; early detection saves ~80% of that
  const hourlyDowntimeCost = 15000;
  const avgDowntimeHours = 8;
  const preventionRate = 0.80;
  const estimatedSavings = Math.round(hourlyDowntimeCost * avgDowntimeHours * failProb * preventionRate);

  if (estimatedSavings < 100) return null;

  return (
    <Card className="p-4 border bg-blue-500/5 border-blue-500/20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Savings</p>
      <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
        ${estimatedSavings.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">from early failure detection</p>
    </Card>
  );
}

export default function CompressorDetailPage() {
  const { compressorId } = useParams<{ compressorId: string }>();
  const [windowType, setWindowType] = useState<WindowType>('1hr');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const hours = timeRangeToHours(timeRange);
  const { data: detail, isLoading: detailLoading } = usePipelineDetail(compressorId);
  const { data: readings, isLoading: readingsLoading } = usePipelineReadings(compressorId, windowType, hours);
  const { data: alerts } = usePipelineAlerts(compressorId);
  const { data: maintenance } = usePipelineMaintenance(compressorId);

  const latest = detail?.latestReading;
  const prediction = detail?.prediction;

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
        {/* Pipeline Info Bar */}
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

        {/* ML Prediction + Cost Savings Row */}
        {prediction && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <RulBadge prediction={prediction} />
            <CostSavingsBadge prediction={prediction} />
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
              label="Temperature"
              unit={SENSOR_THRESHOLDS.discharge_temp_f.unit}
              warningThreshold={SENSOR_THRESHOLDS.discharge_temp_f.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_temp_f.critical}
              color={COLORS.warning}
            />
            <TrendChart
              data={readings}
              sensorKey="suction_pressure_mean"
              label="Inlet Pressure"
              unit="PSI"
              color={COLORS.healthy}
            />
            <TrendChart
              data={readings}
              sensorKey="discharge_pressure_mean"
              label="Outlet Pressure"
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
