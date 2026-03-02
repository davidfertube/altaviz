import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<string, string> = {
  emergency: 'bg-red-700/10 text-red-700 border-red-700/20',
  urgent: 'bg-critical/10 text-critical border-critical/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  low: 'bg-muted text-muted-foreground border-border',
  critical: 'bg-critical/10 text-critical border-critical/20',
  informational: 'bg-muted text-muted-foreground border-border',
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <Badge variant="outline" className={cn('capitalize text-xs', style)}>
      {priority}
    </Badge>
  );
}
