'use client';

import { use, useState } from 'react';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useInvestigation } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import SeverityBadge from '@/components/agents/SeverityBadge';
import ConfidenceBadge from '@/components/agents/ConfidenceBadge';
import EvidenceChain from '@/components/agents/EvidenceChain';

export default function InvestigationDetailPage({ params }: { params: Promise<{ invId: string }> }) {
  const { invId } = use(params);
  const { data: inv, isLoading, mutate } = useInvestigation(invId);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [wasCorrect, setWasCorrect] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [actualCause, setActualCause] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitFeedback() {
    setSubmitting(true);
    try {
      await fetch(`/api/agent/investigations/${invId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          wasCorrect,
          feedback: feedbackText,
          actualRootCause: wasCorrect ? null : actualCause,
        }),
      });
      setFeedbackOpen(false);
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Investigation Detail" subtitle={invId} />

      <div className="p-4 sm:p-6 space-y-6">
        <Link href="/dashboard/investigations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to investigations
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : inv ? (
          <>
            {/* Header card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{inv.root_cause}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{inv.compressor_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={inv.severity} />
                    <ConfidenceBadge confidence={inv.confidence} />
                  </div>
                </div>

                {inv.failure_mode && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Failure mode:</span>{' '}
                    <span className="capitalize">{inv.failure_mode.replace(/_/g, ' ')}</span>
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {inv.estimated_rul_hours != null && (
                    <span>RUL: {inv.estimated_rul_hours.toFixed(0)}h</span>
                  )}
                  {inv.estimated_repair_cost != null && (
                    <span>Est. repair: ${inv.estimated_repair_cost.toLocaleString()}</span>
                  )}
                  <span>{new Date(inv.created_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Evidence chain */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evidence Chain</CardTitle>
              </CardHeader>
              <CardContent>
                <EvidenceChain steps={inv.evidence_chain || []} />
              </CardContent>
            </Card>

            {/* Contributing factors */}
            {inv.contributing_factors?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Contributing Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {inv.contributing_factors.map((f, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-0.5">&bull;</span> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommended actions */}
            {inv.recommended_actions?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inv.recommended_actions.map((a, i) => (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{a.action}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize">{a.priority}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.rationale}</p>
                        {a.estimated_downtime_hours != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Estimated downtime: {a.estimated_downtime_hours}h
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Similar incidents */}
            {inv.similar_incidents?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Similar Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inv.similar_incidents.map((si, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                        <div>
                          <span className="font-mono text-muted-foreground">{si.compressor_id}</span>
                          <span className="mx-2 text-muted-foreground">&middot;</span>
                          <span className="capitalize">{si.failure_mode.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(si.similarity_score * 100)}% match
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Knowledge sources */}
            {inv.knowledge_sources?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Knowledge Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inv.knowledge_sources.map((ks, i) => (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{ks.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(ks.relevance_score * 100)}% relevant
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{ks.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Technician Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {inv.feedback_rating != null ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-4 ${i < (inv.feedback_rating ?? 0) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      ))}
                      <span className="text-sm ml-2">{inv.feedback_correct ? 'Diagnosis correct' : 'Diagnosis incorrect'}</span>
                    </div>
                    {inv.feedback_text && <p className="text-sm text-muted-foreground">{inv.feedback_text}</p>}
                    {inv.actual_root_cause && (
                      <p className="text-sm"><span className="text-muted-foreground">Actual root cause:</span> {inv.actual_root_cause}</p>
                    )}
                  </div>
                ) : !feedbackOpen ? (
                  <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
                    Submit Feedback
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Rating</label>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button key={i} onClick={() => setRating(i + 1)}>
                            <Star className={`size-5 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Was the diagnosis correct?</label>
                      <div className="flex gap-2">
                        <Button variant={wasCorrect ? 'default' : 'outline'} size="sm" onClick={() => setWasCorrect(true)}>Yes</Button>
                        <Button variant={!wasCorrect ? 'default' : 'outline'} size="sm" onClick={() => setWasCorrect(false)}>No</Button>
                      </div>
                    </div>
                    {!wasCorrect && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Actual root cause</label>
                        <input
                          type="text"
                          value={actualCause}
                          onChange={e => setActualCause(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          placeholder="What was the actual root cause?"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Feedback</label>
                      <textarea
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
                        placeholder="Any additional notes..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={submitFeedback} disabled={!rating || submitting}>
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Investigation not found.</p>
        )}
      </div>
    </div>
  );
}
