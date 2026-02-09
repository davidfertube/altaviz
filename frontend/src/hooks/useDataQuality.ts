'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type { DataQualityMetric } from '@/lib/types';

export function useDataQuality(hours = 24) {
  return useSWR<DataQualityMetric[]>(`/api/data-quality?hours=${hours}`, fetcher, {
    refreshInterval: 60000,
    ...swrConfig,
  });
}
