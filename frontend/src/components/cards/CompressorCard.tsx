import Link from 'next/link';
import type { FleetHealthSummary } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/indicators/StatusBadge';
import { formatNumber, formatTimeAgo } from '@/lib/utils';

export default function CompressorCard({ data, linkPrefix = '/dashboard/monitoring' }: { data: FleetHealthSummary; linkPrefix?: string }) {
  return (
    <Link href={`${linkPrefix}/${data.compressor_id}`} className="block group">
      <Card className="hover:shadow-md hover:border-primary/30 transition-all py-4 gap-3">
        <CardContent className="px-5 py-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                {data.compressor_id}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{data.model}</p>
            </div>
            <StatusBadge status={data.health_status} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Vibration</p>
              <p className="text-sm font-mono font-medium">
                {formatNumber(data.vibration_max)} <span className="text-xs text-muted-foreground">mm/s</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temp</p>
              <p className="text-sm font-mono font-medium">
                {formatNumber(data.discharge_temp_max)} <span className="text-xs text-muted-foreground">&deg;F</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="text-sm font-mono font-medium">
                {formatNumber(data.discharge_pressure_mean, 0)} <span className="text-xs text-muted-foreground">PSI</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alerts</p>
              <p className={`text-sm font-mono font-medium ${
                data.active_alert_count > 0 ? 'text-critical' : 'text-healthy'
              }`}>
                {data.active_alert_count}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">{data.station_name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(data.last_reading_time)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
