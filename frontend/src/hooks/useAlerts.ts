'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type { AlertHistory } from '@/lib/types';

type AlertWithMeta = AlertHistory & { model: string; station_id: string; station_name: string };

export function useAlerts(params: {
  status?: string;
  severity?: string;
  compressor?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.severity) searchParams.set('severity', params.severity);
  if (params.compressor) searchParams.set('compressor', params.compressor);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const url = `/api/alerts?${searchParams.toString()}`;
  return useSWR<AlertWithMeta[]>(url, fetcher, { refreshInterval: 30000, ...swrConfig });
}

export async function acknowledgeAlertAction(alertId: number) {
  const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledged_by: 'operator' }),
  });
  return res.json();
}

export async function resolveAlertAction(alertId: number) {
  const res = await fetch(`/api/alerts/${alertId}/resolve`, {
    method: 'PATCH',
  });
  return res.json();
}
