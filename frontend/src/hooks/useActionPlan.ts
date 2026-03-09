'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type { ActionPlan } from '@/lib/action-plan-types';

export function useActionPlans() {
  return useSWR<ActionPlan[]>('/api/action-plan', fetcher, {
    refreshInterval: 30000,
    ...swrConfig,
  });
}

export function useActionPlan(compressorId: string | null) {
  return useSWR<ActionPlan>(
    compressorId ? `/api/action-plan/${compressorId}` : null,
    fetcher,
    { refreshInterval: 30000, ...swrConfig },
  );
}
