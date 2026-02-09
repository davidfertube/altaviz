'use client';

import useSWR from 'swr';
import type { DataQualityMetric } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useDataQuality(hours = 24) {
  return useSWR<DataQualityMetric[]>(`/api/data-quality?hours=${hours}`, fetcher, {
    refreshInterval: 60000,
  });
}
