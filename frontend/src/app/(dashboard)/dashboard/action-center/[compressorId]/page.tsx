'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, DollarSign, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActionPlan } from '@/hooks/useActionPlan';
import ActionStatusBanner from '@/components/action-center/ActionStatusBanner';
import SafetyWarnings from '@/components/action-center/SafetyWarnings';
import ActionChecklist from '@/components/action-center/ActionChecklist';
import QuickActionButtons from '@/components/action-center/QuickActionButtons';
import PartsAndToolsList from '@/components/action-center/PartsAndToolsList';
import SimilarFixesSection from '@/components/action-center/SimilarFixesSection';
import TeamsNotificationCard from '@/components/action-center/TeamsNotificationCard';

export default function ActionCenterDetailPage() {
  const { compressorId } = useParams<{ compressorId: string }>();
  const { data: plan, isLoading, error } = useActionPlan(compressorId);

  if (isLoading) {
    return (
      <>
        <Header title="Action Center" />
        <div className="p-4 sm:p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/50" />
          ))}
        </div>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <Header title="Action Center" />
        <div className="p-4 sm:p-6">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No action plan found for {compressorId}.</p>
            <Link href="/dashboard/action-center">
              <Button variant="outline">
                <ArrowLeft className="size-4 mr-2" />
                Back to Action Center
              </Button>
            </Link>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`Action Center — ${compressorId}`} subtitle={plan.stationName} />
      <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/dashboard/action-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          All Action Plans
        </Link>

        {/* 1. Status Banner */}
        <ActionStatusBanner plan={plan} />

        {/* 2. What's Happening */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What&apos;s Happening</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              {plan.diagnosis}
            </p>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-semibold">{(plan.confidence * 100).toFixed(0)}%</span>
              </span>
              {plan.estimatedHours != null && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. Time:</span>
                  <span className="font-semibold">{plan.estimatedHours}h</span>
                </span>
              )}
              {plan.estimatedCost != null && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="font-semibold">${plan.estimatedCost.toLocaleString()}</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Safety First */}
        <SafetyWarnings warnings={plan.safetyWarnings} />

        {/* 4. What To Do */}
        <ActionChecklist steps={plan.actionSteps} />

        {/* 5. Quick Actions */}
        <QuickActionButtons routing={plan.routing} />

        {/* 6. Parts & Tools */}
        <PartsAndToolsList items={plan.partsAndTools} />

        {/* 7. Similar Past Fixes */}
        <SimilarFixesSection fixes={plan.similarFixes} />

        {/* 8. Teams Notification */}
        <TeamsNotificationCard data={plan.teamsNotification} />
      </div>
    </>
  );
}
