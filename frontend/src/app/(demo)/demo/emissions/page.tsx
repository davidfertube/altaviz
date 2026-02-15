'use client';

import useSWR from 'swr';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/cards/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COLORS } from '@/lib/constants';
import type { EmissionsEstimate } from '@/lib/demo-data';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface EmissionsResponse {
  estimates: EmissionsEstimate[];
  fleet_summary: {
    total_pipelines: number;
    total_co2e_tonnes_hr: number;
    annual_projected_co2e: number;
    reporting_threshold: number;
    requires_reporting: boolean;
    status: string;
  };
}

function ComplianceBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    compliant: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Compliant' },
    near_threshold: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Near Threshold' },
    reporting_required: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Reporting Required' },
  };
  const s = styles[status] || styles.compliant;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function DemoEmissionsPage() {
  const { data, isLoading } = useSWR<EmissionsResponse>('/api/demo/emissions', fetcher);

  const summary = data?.fleet_summary;
  const estimates = data?.estimates || [];

  return (
    <div className="min-h-screen">
      <Header title="Emissions Monitoring" subtitle="EPA Subpart W compliance and methane tracking" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Fleet CO2e/hr"
            value={summary ? `${summary.total_co2e_tonnes_hr.toFixed(2)}t` : '...'}
            subtitle="Tonnes CO2-equivalent"
          />
          <MetricCard
            label="Annual Projected"
            value={summary ? `${(summary.annual_projected_co2e / 1000).toFixed(1)}k` : '...'}
            subtitle="Tonnes CO2e/year"
          />
          <MetricCard
            label="EPA Threshold"
            value="25,000t"
            subtitle="Subpart W reporting"
          />
          <MetricCard
            label="Compliance"
            value={summary?.status === 'compliant' ? 'Pass' : 'Review'}
            subtitle={summary?.requires_reporting ? 'Reporting required' : 'Below threshold'}
            status={summary?.status === 'compliant' ? 'healthy' : summary?.status === 'near_threshold' ? 'warning' : 'critical'}
          />
        </div>

        {/* Compliance Status */}
        <Card>
          <CardHeader className="py-3 px-4 sm:px-6 flex-row items-center justify-between">
            <CardTitle className="text-sm">EPA Subpart W Status</CardTitle>
            {summary && <ComplianceBadge status={summary.status} />}
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4">
            {summary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual Projected Emissions</span>
                  <span className="font-mono font-medium">{summary.annual_projected_co2e.toLocaleString()} tonnes CO2e</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((summary.annual_projected_co2e / summary.reporting_threshold) * 100, 100)}%`,
                      backgroundColor: summary.status === 'compliant' ? COLORS.healthy : summary.status === 'near_threshold' ? COLORS.warning : COLORS.critical,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>25,000t threshold</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-Pipeline Emissions */}
        <Card>
          <CardHeader className="py-3 px-4 sm:px-6">
            <CardTitle className="text-sm">Per-Pipeline Emissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading emissions data...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Pipeline</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">CH4 (tonnes)</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">CO2e (tonnes)</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Fugitive Rate</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((e) => (
                      <tr key={e.compressor_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono font-medium">{e.compressor_id}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{e.methane_tonnes.toFixed(6)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{e.co2e_tonnes.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{e.emission_rate_scfh} scfh</td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge variant="outline" className="text-xs">EPA SubW</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
