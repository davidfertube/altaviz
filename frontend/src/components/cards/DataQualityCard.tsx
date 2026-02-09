import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DataQualityCardProps {
  label: string;
  value: number | null;
  passing: boolean | null;
  description: string;
}

export default function DataQualityCard({ label, value, passing, description }: DataQualityCardProps) {
  const pct = value != null ? Math.round(value * 100) : null;

  return (
    <Card className="py-4 gap-2">
      <CardContent className="px-5 py-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{label}</p>
          {passing != null && (
            <Badge
              variant="outline"
              className={passing
                ? 'bg-healthy/10 text-healthy border-healthy/20 hover:bg-healthy/10'
                : 'bg-critical/10 text-critical border-critical/20 hover:bg-critical/10'
              }
            >
              {passing ? 'Pass' : 'Fail'}
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold font-mono tracking-tight">
          {pct != null ? `${pct}%` : '--'}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>

        {pct != null && (
          <div className="h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${passing ? 'bg-healthy' : 'bg-critical'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
