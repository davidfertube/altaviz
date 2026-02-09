import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/lib/types';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string };
  status?: HealthStatus;
  subtitle?: string;
}

const statusColors: Record<HealthStatus, string> = {
  healthy: 'text-healthy',
  warning: 'text-warning',
  critical: 'text-critical',
};

export default function MetricCard({ label, value, unit, trend, status, subtitle }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow py-4 gap-1">
      <CardContent className="px-5 py-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={cn('text-3xl font-bold font-mono tracking-tight', status && statusColors[status])}>
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {(trend || subtitle) && (
          <div className="flex items-center gap-2 mt-1.5">
            {trend && (
              <span className={cn(
                'text-xs font-medium flex items-center gap-0.5',
                trend.direction === 'up' ? 'text-critical' :
                trend.direction === 'down' ? 'text-healthy' :
                'text-muted-foreground'
              )}>
                {trend.direction === 'up' && <TrendingUp className="size-3" />}
                {trend.direction === 'down' && <TrendingDown className="size-3" />}
                {trend.direction === 'flat' && <Minus className="size-3" />}
                {trend.value}
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
