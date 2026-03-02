'use client';

import { DollarSign, Leaf, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OptimizationRecommendation } from '@/lib/types';
import PriorityBadge from './PriorityBadge';
import ConfidenceBadge from './ConfidenceBadge';
import { Badge } from '@/components/ui/badge';

export default function RecommendationCard({ rec }: { rec: OptimizationRecommendation }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium truncate">{rec.title}</CardTitle>
          <PriorityBadge priority={rec.priority} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">{rec.rec_type.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{rec.scope}</Badge>
          <ConfidenceBadge confidence={rec.confidence} />
        </div>

        {rec.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {rec.estimated_savings_usd != null && (
            <span className="flex items-center gap-1 text-healthy">
              <DollarSign className="size-3" />
              ${rec.estimated_savings_usd.toLocaleString()} saved
            </span>
          )}
          {rec.estimated_emissions_reduction_tonnes != null && (
            <span className="flex items-center gap-1 text-healthy">
              <Leaf className="size-3" />
              {rec.estimated_emissions_reduction_tonnes.toFixed(1)}t CO2e
            </span>
          )}
          {rec.estimated_uptime_improvement_pct != null && (
            <span className="flex items-center gap-1 text-primary">
              <TrendingUp className="size-3" />
              +{rec.estimated_uptime_improvement_pct.toFixed(1)}% uptime
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {rec.target_ids.length} target{rec.target_ids.length !== 1 ? 's' : ''}
          {' \u00B7 '}
          {new Date(rec.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
