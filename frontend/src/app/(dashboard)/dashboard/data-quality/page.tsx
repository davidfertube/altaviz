'use client';

import { useDataQuality } from '@/hooks/useDataQuality';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/cards/MetricCard';
import DataQualityCard from '@/components/cards/DataQualityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

type MetricType = 'freshness' | 'completeness' | 'consistency' | 'accuracy';

const DESCRIPTIONS: Record<MetricType, string> = {
  freshness: 'Time since last data ingestion vs 15-minute SLA',
  completeness: 'Percentage of expected readings received (target: >95%)',
  consistency: 'Schema validation and format compliance rate',
  accuracy: 'Percentage of readings within expected statistical bounds',
};

export default function DataQualityPage() {
  const { data: metrics, isLoading } = useDataQuality();

  const latestByType = new Map<MetricType, { value: number | null; passing: boolean | null }>();
  if (metrics) {
    for (const m of metrics) {
      const type = m.metric_type as MetricType;
      if (!latestByType.has(type)) {
        latestByType.set(type, { value: m.metric_value, passing: m.pass_threshold });
      }
    }
  }

  const dimensions: MetricType[] = ['freshness', 'completeness', 'consistency', 'accuracy'];
  const avgScore = dimensions.reduce((sum, d) => {
    const v = latestByType.get(d)?.value;
    return sum + (v ?? 0);
  }, 0) / dimensions.length;
  const overallPct = Math.round(avgScore * 100);
  const allPassing = dimensions.every(d => latestByType.get(d)?.passing !== false);

  return (
    <div className="min-h-screen">
      <Header title="Data Quality" subtitle="Pipeline health and data reliability metrics" />

      <div className="p-4 sm:p-6 space-y-6">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </>
        ) : metrics && metrics.length > 0 ? (
          <>
            <MetricCard
              label="Pipeline Health Score"
              value={`${overallPct}%`}
              subtitle={allPassing ? 'All checks passing' : 'Some checks failing'}
              status={allPassing ? 'healthy' : 'critical'}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {dimensions.map(d => {
                const data = latestByType.get(d);
                return (
                  <DataQualityCard
                    key={d}
                    label={d.charAt(0).toUpperCase() + d.slice(1)}
                    value={data?.value ?? null}
                    passing={data?.passing ?? null}
                    description={DESCRIPTIONS[d]}
                  />
                );
              })}
            </div>

            <Card>
              <CardHeader className="py-3 px-4 sm:px-6">
                <CardTitle className="text-sm">Recent Quality Checks</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wider">Timestamp</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider hidden sm:table-cell">Compressor</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">Metric</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">Value</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.slice(0, 20).map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(m.metric_timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="font-medium hidden sm:table-cell">{m.compressor_id || 'Global'}</TableCell>
                        <TableCell className="capitalize">{m.metric_type}</TableCell>
                        <TableCell className="font-mono">{m.metric_value != null ? `${(m.metric_value * 100).toFixed(1)}%` : '--'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={m.pass_threshold
                              ? 'bg-healthy/10 text-healthy border-healthy/20 hover:bg-healthy/10'
                              : 'bg-critical/10 text-critical border-critical/20 hover:bg-critical/10'
                            }
                          >
                            {m.pass_threshold ? 'Pass' : 'Fail'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <EmptyState
            title="No quality metrics"
            message="Run the ETL pipeline to generate data quality metrics."
          />
        )}
      </div>
    </div>
  );
}
