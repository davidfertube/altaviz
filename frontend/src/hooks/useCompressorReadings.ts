'use client';

import useSWR from 'swr';
import type { SensorReadingAgg, CompressorMetadata, LatestReading, WindowType, AlertHistory, MaintenanceEvent } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useCompressorDetail(compressorId: string) {
  return useSWR<{ metadata: CompressorMetadata & { station_name: string }; latestReading: LatestReading | null }>(
    `/api/compressors/${compressorId}`,
    fetcher
  );
}

export function useCompressorReadings(compressorId: string, windowType: WindowType, hours: number) {
  return useSWR<SensorReadingAgg[]>(
    `/api/compressors/${compressorId}/readings?window=${windowType}&hours=${hours}`,
    fetcher,
    { refreshInterval: 60000 }
  );
}

export function useCompressorAlerts(compressorId: string) {
  return useSWR<(AlertHistory & { model: string; station_id: string; station_name: string })[]>(
    `/api/alerts?compressor=${compressorId}&limit=20`,
    fetcher
  );
}

export function useCompressorMaintenance(compressorId: string) {
  return useSWR<MaintenanceEvent[]>(
    `/api/maintenance?compressor=${compressorId}`,
    fetcher
  );
}
