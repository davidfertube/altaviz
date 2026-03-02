import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InvestigationSeverity } from '@/lib/types';

const SEVERITY_STYLES: Record<string, string> = {
  healthy: 'bg-healthy/10 text-healthy border-healthy/20',
  early_warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-critical/10 text-critical border-critical/20',
  emergency: 'bg-red-700/10 text-red-700 border-red-700/20',
};

export default function SeverityBadge({ severity }: { severity: InvestigationSeverity | string }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.warning;
  return (
    <Badge variant="outline" className={cn('capitalize text-xs gap-1.5', style)}>
      <span className={cn('size-1.5 rounded-full', severity === 'healthy' ? 'bg-healthy' : severity === 'critical' || severity === 'emergency' ? 'bg-critical' : 'bg-warning')} />
      {severity.replace('_', ' ')}
    </Badge>
  );
}
