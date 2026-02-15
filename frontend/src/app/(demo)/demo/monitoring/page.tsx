'use client';

import useSWR from 'swr';
import Header from '@/components/layout/Header';
import CompressorCard from '@/components/cards/CompressorCard';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import type { FleetHealthSummary } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DemoMonitoringPage() {
  const { data: fleet, isLoading } = useSWR<FleetHealthSummary[]>('/api/demo/fleet', fetcher);

  return (
    <div className="min-h-screen">
      <Header title="Monitoring" subtitle="All compressors at a glance" />

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : fleet && fleet.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fleet.map(c => (
              <CompressorCard key={c.compressor_id} data={c} linkPrefix="/demo/monitoring" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
