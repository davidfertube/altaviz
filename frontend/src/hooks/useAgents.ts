'use client';

import useSWR from 'swr';
import { fetcher, swrConfig } from '@/lib/fetcher';
import type {
  WorkOrder,
  InvestigationReport,
  OptimizationRecommendation,
  AgentSession,
} from '@/lib/types';

// === WORK ORDERS ===

export function useWorkOrders(params?: { status?: string; priority?: string; compressorId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.compressorId) searchParams.set('compressor_id', params.compressorId);
  const qs = searchParams.toString();
  const url = `/api/agent/work-orders${qs ? `?${qs}` : ''}`;
  return useSWR<WorkOrder[]>(url, fetcher, { refreshInterval: 30000, ...swrConfig });
}

export function useWorkOrder(workOrderId: string | null) {
  return useSWR<WorkOrder & { timeline: Array<{ from_status: string | null; to_status: string; changed_by: string | null; reason: string | null; created_at: string }> }>(
    workOrderId ? `/api/agent/work-orders/${workOrderId}` : null,
    fetcher,
    { refreshInterval: 30000, ...swrConfig }
  );
}

// === INVESTIGATIONS ===

export function useInvestigations(params?: { compressorId?: string; severity?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.compressorId) searchParams.set('compressor_id', params.compressorId);
  if (params?.severity) searchParams.set('severity', params.severity);
  const qs = searchParams.toString();
  const url = `/api/agent/investigations${qs ? `?${qs}` : ''}`;
  return useSWR<InvestigationReport[]>(url, fetcher, { refreshInterval: 30000, ...swrConfig });
}

export function useInvestigation(investigationId: string | null) {
  return useSWR<InvestigationReport>(
    investigationId ? `/api/agent/investigations/${investigationId}` : null,
    fetcher,
    { refreshInterval: 30000, ...swrConfig }
  );
}

// === OPTIMIZATION ===

export function useOptimizationRecommendations(params?: { status?: string; scope?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.scope) searchParams.set('scope', params.scope);
  const qs = searchParams.toString();
  const url = `/api/agent/optimization/recommendations${qs ? `?${qs}` : ''}`;
  return useSWR<OptimizationRecommendation[]>(url, fetcher, { refreshInterval: 60000, ...swrConfig });
}

// === AGENT SESSIONS ===

export function useAgentSessions(params?: { agentType?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.agentType) searchParams.set('agent_type', params.agentType);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = `/api/agent/sessions${qs ? `?${qs}` : ''}`;
  return useSWR<AgentSession[]>(url, fetcher, { refreshInterval: 30000, ...swrConfig });
}
