'use client';

import useSWR from 'swr';
import type { FleetHealthSummary, ActiveAlert, LatestReading } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useFleetHealth() {
  return useSWR<FleetHealthSummary[]>('/api/fleet', fetcher, {
    refreshInterval: 30000,
  });
}

export function useActiveAlerts() {
  return useSWR<ActiveAlert[]>('/api/alerts?status=active', fetcher, {
    refreshInterval: 30000,
  });
}

export function useLatestReadings() {
  return useSWR<LatestReading[]>('/api/readings/latest', fetcher, {
    refreshInterval: 30000,
  });
}
