'use client';

import { useState } from 'react';
import { TrendingUp, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useOptimizationRecommendations } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RecommendationCard from '@/components/agents/RecommendationCard';
import AgentActivityFeed from '@/components/agents/AgentActivityFeed';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OptimizationPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('active');
  const { data: recommendations, isLoading, mutate } = useOptimizationRecommendations({ status: statusFilter });
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    setScanning(true);
    try {
      await fetch('/api/agent/optimization/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      mutate();
    } finally {
      setScanning(false);
    }
  }

  const statuses = ['all', 'active', 'accepted', 'implemented', 'dismissed'];

  return (
    <div className="min-h-screen">
      <Header title="Fleet Optimization" subtitle="AI-powered fleet management and recommendations" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {statuses.map(s => (
              <Button
                key={s}
                variant={(!statusFilter && s === 'all') || statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s === 'all' ? undefined : s)}
                className="text-xs capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/optimization/chat">
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageSquare className="size-3.5" />
                Chat
              </Button>
            </Link>
            <Button size="sm" onClick={runScan} disabled={scanning} className="gap-1.5">
              {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Run Fleet Scan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Recommendations - main area */}
          <div className="xl:col-span-3 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-64" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recommendations.map(rec => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recommendations"
                message="Run a fleet scan to generate optimization recommendations."
              />
            )}
          </div>

          {/* Sidebar - agent activity */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Agent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentActivityFeed limit={8} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
