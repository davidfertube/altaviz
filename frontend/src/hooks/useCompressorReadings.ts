'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type { SensorReadingAgg, CompressorMetadata, LatestReading, WindowType, AlertHistory, MaintenanceEvent, MlPrediction } from '@/lib/types';

export function useCompressorDetail(compressorId: string) {
  return useSWR<{ metadata: CompressorMetadata & { station_name: string }; latestReading: LatestReading | null; prediction: MlPrediction | null }>(
    `/api/compressors/${compressorId}`,
    fetcher,
    swrConfig,
  );
}

export function useCompressorReadings(compressorId: string, windowType: WindowType, hours: number) {
  return useSWR<SensorReadingAgg[]>(
    `/api/compressors/${compressorId}/readings?window=${windowType}&hours=${hours}`,
    fetcher,
    { refreshInterval: 60000, ...swrConfig },
  );
}

export function useCompressorAlerts(compressorId: string) {
  return useSWR<(AlertHistory & { model: string; station_id: string; station_name: string })[]>(
    `/api/alerts?compressor=${compressorId}&limit=20`,
    fetcher,
    swrConfig,
  );
}

export function useCompressorMaintenance(compressorId: string) {
  return useSWR<MaintenanceEvent[]>(
    `/api/maintenance?compressor=${compressorId}`,
    fetcher,
    swrConfig,
  );
}
