'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import GaugeChart from '@/components/charts/GaugeChart';
import TrendChart from '@/components/charts/TrendChart';
import AlertTable from '@/components/tables/AlertTable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/indicators/StatusBadge';
import { MetricCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { SENSOR_THRESHOLDS, COLORS } from '@/lib/constants';
import type { FleetHealthSummary, SensorReadingAgg, ActiveAlert, HealthStatus, MlPrediction } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Demo ML prediction for degrading units
const DEMO_PREDICTIONS: Record<string, MlPrediction> = {
  'COMP-003': {
    id: 1,
    compressor_id: 'COMP-003',
    prediction_timestamp: new Date().toISOString(),
    rul_days: 3.2,
    failure_probability: 0.87,
    confidence_score: 0.91,
    model_version: 'isolation-forest-v1.0',
    features_used: { vibration_mean: 7.8, discharge_temp_mean: 248, pressure_ratio: 21.5 },
    created_at: new Date().toISOString(),
  },
  'COMP-007': {
    id: 2,
    compressor_id: 'COMP-007',
    prediction_timestamp: new Date().toISOString(),
    rul_days: 8.5,
    failure_probability: 0.42,
    confidence_score: 0.78,
    model_version: 'isolation-forest-v1.0',
    features_used: { vibration_mean: 6.4, discharge_temp_mean: 235, pressure_ratio: 20.3 },
    created_at: new Date().toISOString(),
  },
};

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

export default function DemoCompressorDetailPage() {
  const { compressorId } = useParams<{ compressorId: string }>();

  const { data: fleet } = useSWR<FleetHealthSummary[]>('/api/demo/fleet', fetcher);
  const { data: readings, isLoading: readingsLoading } = useSWR<SensorReadingAgg[]>(
    `/api/demo/readings/${compressorId}`, fetcher
  );
  const { data: allAlerts } = useSWR<ActiveAlert[]>('/api/demo/alerts', fetcher);

  const compressor = fleet?.find(c => c.compressor_id === compressorId);
  const alerts = allAlerts?.filter(a => a.compressor_id === compressorId) || [];
  const prediction = DEMO_PREDICTIONS[compressorId];
  const latest = readings?.[readings.length - 1];

  let healthStatus: HealthStatus = 'healthy';
  if (alerts.some(a => a.severity === 'critical' && !a.resolved)) healthStatus = 'critical';
  else if (alerts.some(a => a.severity === 'warning' && !a.resolved)) healthStatus = 'warning';

  const model = compressor?.model || 'Loading...';
  const station = compressor?.station_name || '';

  return (
    <div className="min-h-screen">
      <Header title={compressorId} subtitle={`${model} at ${station}`} />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Status Bar */}
        {compressor && (
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <StatusBadge status={healthStatus} size="md" />
            <span className="text-sm text-muted-foreground">Model: <span className="text-foreground font-medium">{model}</span></span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Station: <span className="text-foreground font-medium">{station}</span></span>
          </div>
        )}

        {/* ML Prediction */}
        {prediction && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <RulBadge prediction={prediction} />
          </div>
        )}

        {/* Gauge Charts */}
        {!latest ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <GaugeChart
              value={latest.vibration_mean}
              min={0} max={12}
              warningThreshold={SENSOR_THRESHOLDS.vibration_mms.warning}
              criticalThreshold={SENSOR_THRESHOLDS.vibration_mms.critical}
              label={SENSOR_THRESHOLDS.vibration_mms.label}
              unit={SENSOR_THRESHOLDS.vibration_mms.unit}
            />
            <GaugeChart
              value={latest.discharge_temp_mean}
              min={100} max={300}
              warningThreshold={SENSOR_THRESHOLDS.discharge_temp_f.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_temp_f.critical}
              label={SENSOR_THRESHOLDS.discharge_temp_f.label}
              unit={SENSOR_THRESHOLDS.discharge_temp_f.unit}
            />
            <GaugeChart
              value={latest.suction_pressure_mean}
              min={0} max={100}
              warningThreshold={SENSOR_THRESHOLDS.suction_pressure_psi.warning_low}
              criticalThreshold={SENSOR_THRESHOLDS.suction_pressure_psi.critical_low}
              label={SENSOR_THRESHOLDS.suction_pressure_psi.label}
              unit={SENSOR_THRESHOLDS.suction_pressure_psi.unit}
              inverted
            />
            <GaugeChart
              value={latest.discharge_pressure_mean}
              min={700} max={1600}
              warningThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.warning}
              criticalThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.critical}
              label={SENSOR_THRESHOLDS.discharge_pressure_psi.label}
              unit={SENSOR_THRESHOLDS.discharge_pressure_psi.unit}
            />
          </div>
        )}

        {/* Trend Charts */}
        {readingsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : readings && readings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart data={readings} sensorKey="vibration_mean" label="Vibration" unit="mm/s" warningThreshold={SENSOR_THRESHOLDS.vibration_mms.warning} criticalThreshold={SENSOR_THRESHOLDS.vibration_mms.critical} color={COLORS.primary} />
            <TrendChart data={readings} sensorKey="discharge_temp_mean" label="Discharge Temperature" unit={SENSOR_THRESHOLDS.discharge_temp_f.unit} warningThreshold={SENSOR_THRESHOLDS.discharge_temp_f.warning} criticalThreshold={SENSOR_THRESHOLDS.discharge_temp_f.critical} color={COLORS.warning} />
            <TrendChart data={readings} sensorKey="suction_pressure_mean" label="Suction Pressure" unit="PSI" color={COLORS.healthy} />
            <TrendChart data={readings} sensorKey="discharge_pressure_mean" label="Discharge Pressure" unit="PSI" warningThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.warning} criticalThreshold={SENSOR_THRESHOLDS.discharge_pressure_psi.critical} color={COLORS.critical} />
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">No readings available</div>
        )}

        {/* Alerts for this compressor */}
        {alerts.length > 0 && (
          <Card className="py-0 gap-0">
            <div className="px-4 sm:px-6 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Alerts
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{alerts.length}</Badge>
              </h3>
            </div>
            <AlertTable alerts={alerts} compact />
          </Card>
        )}
      </div>
    </div>
  );
}
