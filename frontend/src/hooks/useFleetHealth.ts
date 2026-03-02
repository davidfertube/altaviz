'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type { FleetHealthSummary, ActiveAlert } from '@/lib/types';

export function useFleetHealth() {
  return useSWR<FleetHealthSummary[]>('/api/fleet', fetcher, {
    refreshInterval: 30000,
    ...swrConfig,
  });
}

export function useActiveAlerts() {
  return useSWR<ActiveAlert[]>('/api/alerts?status=active', fetcher, {
    refreshInterval: 30000,
    ...swrConfig,
  });
}
