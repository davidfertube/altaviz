import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function getConfidenceLevel(confidence: number) {
  if (confidence >= 0.8) return { label: 'High', color: 'bg-healthy/10 text-healthy border-healthy/20' };
  if (confidence >= 0.6) return { label: 'Medium', color: 'bg-warning/10 text-warning border-warning/20' };
  return { label: 'Low', color: 'bg-critical/10 text-critical border-critical/20' };
}

export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { label, color } = getConfidenceLevel(confidence);
  return (
    <Badge variant="outline" className={cn('gap-1.5 text-xs', color)}>
      {label} ({Math.round(confidence * 100)}%)
    </Badge>
  );
}
