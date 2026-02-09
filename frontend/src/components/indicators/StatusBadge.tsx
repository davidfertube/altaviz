import type { HealthStatus, Severity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeStatus = HealthStatus | Severity;

const BADGE_STYLES: Record<BadgeStatus, string> = {
  healthy: 'bg-healthy/10 text-healthy border-healthy/20 hover:bg-healthy/10',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/10',
  critical: 'bg-critical/10 text-critical border-critical/20 hover:bg-critical/10',
};

const DOT_STYLES: Record<BadgeStatus, string> = {
  healthy: 'bg-healthy',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

export default function StatusBadge({ status, size = 'sm' }: { status: BadgeStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize gap-1.5',
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        BADGE_STYLES[status]
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_STYLES[status])} />
      {status}
    </Badge>
  );
}
