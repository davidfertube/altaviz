export type Platform = "meta" | "google" | "taboola" | "tiktok";

export const PLATFORMS: Platform[] = ["meta", "google", "taboola", "tiktok"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  meta: "Meta",
  google: "Google",
  taboola: "Taboola",
  tiktok: "TikTok",
};

export type CreativeType = "video" | "image" | "carousel" | "native";

export interface DailyMetric {
  /** ISO date yyyy-mm-dd */
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  /** Leads captured (email/SMS signups) */
  conversions: number;
  /** Attributed downstream affiliate revenue */
  revenue: number;
  /** Average impressions per unique user that day */
  frequency: number;
}

export interface Ad {
  id: string;
  name: string;
  adSetId: string;
  campaignId: string;
  platform: Platform;
  creativeType: CreativeType;
  headline: string;
  angle: string;
  status: "active" | "paused";
  metrics: DailyMetric[];
}

export interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  platform: Platform;
  audience: string;
  dailyBudget: number;
  ads: Ad[];
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  vertical: string;
  objective: "lead_gen";
  status: "active" | "paused";
  dailyBudget: number;
  /** Payout received per qualified lead */
  payoutPerLead: number;
  adSets: AdSet[];
}

export interface Account {
  generatedAt: string;
  days: number;
  campaigns: Campaign[];
}

/* ---------- derived metrics ---------- */

export interface KpiSummary {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cpa: number | null;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  roas: number | null;
}

export function summarize(metrics: DailyMetric[]): KpiSummary {
  const t = metrics.reduce(
    (acc, m) => {
      acc.spend += m.spend;
      acc.impressions += m.impressions;
      acc.clicks += m.clicks;
      acc.conversions += m.conversions;
      acc.revenue += m.revenue;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );
  return {
    ...t,
    cpa: t.conversions > 0 ? t.spend / t.conversions : null,
    ctr: t.impressions > 0 ? t.clicks / t.impressions : null,
    cpc: t.clicks > 0 ? t.spend / t.clicks : null,
    cvr: t.clicks > 0 ? t.conversions / t.clicks : null,
    roas: t.spend > 0 ? t.revenue / t.spend : null,
  };
}

/** Sum per-date metrics across many ads into one daily series. */
export function rollupDaily(series: DailyMetric[][]): DailyMetric[] {
  const byDate = new Map<string, DailyMetric>();
  for (const metrics of series) {
    for (const m of metrics) {
      const cur = byDate.get(m.date);
      if (!cur) {
        byDate.set(m.date, { ...m });
      } else {
        cur.spend += m.spend;
        cur.impressions += m.impressions;
        cur.clicks += m.clicks;
        cur.conversions += m.conversions;
        cur.revenue += m.revenue;
        // frequency is impression-weighted
        cur.frequency =
          (cur.frequency * (cur.impressions - m.impressions) +
            m.frequency * m.impressions) /
          cur.impressions;
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function campaignDaily(c: Campaign): DailyMetric[] {
  return rollupDaily(c.adSets.flatMap((s) => s.ads.map((a) => a.metrics)));
}

export function lastNDays<T extends { date: string }>(rows: T[], n: number): T[] {
  return rows.slice(Math.max(0, rows.length - n));
}
