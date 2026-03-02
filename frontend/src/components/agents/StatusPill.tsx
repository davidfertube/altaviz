import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WorkOrderStatus } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_approval: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  rejected: 'bg-critical/10 text-critical border-critical/20',
  assigned: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-healthy/10 text-healthy border-healthy/20',
  verified: 'bg-healthy/10 text-healthy border-healthy/20',
  cancelled: 'bg-muted text-muted-foreground border-border line-through',
};

export default function StatusPill({ status }: { status: WorkOrderStatus | string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <Badge variant="outline" className={cn('capitalize text-xs', style)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
