'use client';

import { useState } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useInvestigations } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SeverityBadge from '@/components/agents/SeverityBadge';
import ConfidenceBadge from '@/components/agents/ConfidenceBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function InvestigationsPage() {
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const { data: investigations, isLoading } = useInvestigations({ severity: severityFilter });

  const severities = ['all', 'emergency', 'critical', 'warning', 'early_warning', 'healthy'];

  return (
    <div className="min-h-screen">
      <Header title="Investigations" subtitle="AI-powered root cause analysis" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {severities.map(s => (
            <Button
              key={s}
              variant={(!severityFilter && s === 'all') || severityFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(s === 'all' ? undefined : s)}
              className="text-xs capitalize"
            >
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>

        {/* List */}
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
        ) : investigations && investigations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {investigations.map(inv => (
              <Link key={inv.id} href={`/dashboard/investigations/${inv.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-medium truncate">
                        <span className="font-mono text-muted-foreground mr-2">{inv.compressor_id}</span>
                        {inv.root_cause}
                      </CardTitle>
                      <SeverityBadge severity={inv.severity} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ConfidenceBadge confidence={inv.confidence} />
                      {inv.failure_mode && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {inv.failure_mode.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {inv.evidence_chain?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {inv.evidence_chain.length} evidence steps
                        {inv.similar_incidents?.length > 0 && ` \u00B7 ${inv.similar_incidents.length} similar incidents`}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                      {inv.feedback_rating != null && (
                        <span className="text-xs text-muted-foreground">
                          {'★'.repeat(inv.feedback_rating)}{'☆'.repeat(5 - inv.feedback_rating)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No investigations yet"
            message="Start an investigation from a compressor's detail page or use the button below."
          />
        )}
      </div>
    </div>
  );
}
