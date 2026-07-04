import { getAccount } from "@/lib/data/generate";
import {
  Account,
  Campaign,
  Platform,
  campaignDaily,
  lastNDays,
  summarize,
} from "@/lib/data/types";

export type AnomalySeverity = "critical" | "warning" | "opportunity";

export type AnomalyType =
  | "creative_fatigue"
  | "cpa_drift"
  | "spend_spike"
  | "tracking_outage"
  | "scale_opportunity";

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  platform: Platform;
  campaignId: string;
  campaignName: string;
  adSetId?: string;
  adId?: string;
  adName?: string;
  title: string;
  /** Plain-language statistical evidence for the finding */
  evidence: string;
  window: { start: string; end: string };
  /** Estimated dollars/day being lost (or left on the table for opportunities) */
  estDailyImpactUsd: number;
  recommendation: string;
}

/* ---------- small stats helpers ---------- */

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Ordinary least-squares slope over an evenly spaced series. */
function slope(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(xs);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (xs[i] - my);
    den += (i - mx) ** 2;
  }
  return den ? num / den : 0;
}

function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/* ---------- detectors ----------
 * Each detector compares a recent window against a trailing baseline with
 * minimum-spend significance gates, so tiny campaigns can't fire noisy alerts.
 */

const MIN_DAILY_SPEND = 50;

function detectCreativeFatigue(c: Campaign): Anomaly[] {
  const out: Anomaly[] = [];
  for (const adSet of c.adSets) {
    for (const ad of adSet.ads) {
      const recent = lastNDays(ad.metrics, 7);
      const baseline = ad.metrics.slice(-28, -7);
      if (baseline.length < 14) continue;
      const recentKpi = summarize(recent);
      const baseKpi = summarize(baseline);
      if (recentKpi.spend / 7 < MIN_DAILY_SPEND) continue;
      if (recentKpi.ctr == null || baseKpi.ctr == null) continue;

      const ctrDrop = 1 - recentKpi.ctr / baseKpi.ctr;
      const freqRecent = mean(recent.map((m) => m.frequency));
      const freqBase = mean(baseline.map((m) => m.frequency));
      const freqSlope = slope(lastNDays(ad.metrics, 14).map((m) => m.frequency));

      // Fatigue = audience saturation (frequency up) AND response decay (CTR down)
      if (ctrDrop > 0.25 && freqRecent > freqBase * 1.3 && freqSlope > 0.05) {
        const baselineCpa = baseKpi.cpa ?? 0;
        const recentCpa = recentKpi.cpa ?? 0;
        const dailySpend = recentKpi.spend / 7;
        const wasted =
          baselineCpa > 0 && recentCpa > baselineCpa
            ? dailySpend * (1 - baselineCpa / recentCpa)
            : dailySpend * ctrDrop * 0.5;
        out.push({
          id: `fatigue-${ad.id}`,
          type: "creative_fatigue",
          severity: "critical",
          platform: c.platform,
          campaignId: c.id,
          campaignName: c.name,
          adSetId: adSet.id,
          adId: ad.id,
          adName: ad.name,
          title: `Creative fatigue: ${ad.name}`,
          evidence:
            `CTR down ${pct(ctrDrop)} vs 3-week baseline (${(recentKpi.ctr * 100).toFixed(2)}% vs ` +
            `${(baseKpi.ctr * 100).toFixed(2)}%) while frequency climbed from ${freqBase.toFixed(1)} to ` +
            `${freqRecent.toFixed(1)}. CPA moved from ${fmtUsd(baselineCpa)} to ${fmtUsd(recentCpa)}.`,
          window: { start: recent[0].date, end: recent[recent.length - 1].date },
          estDailyImpactUsd: Math.round(wasted),
          recommendation: `Pause ${ad.name} and rotate in refreshed creative on the same angle ("${ad.angle}"). The audience is saturated — new hooks, not new audiences.`,
        });
      }
    }
  }
  return out;
}

function detectCpaDrift(c: Campaign): Anomaly[] {
  const daily = campaignDaily(c);
  const recent = lastNDays(daily, 7);
  const baseline = daily.slice(-35, -14);
  if (baseline.length < 14) return [];
  const baseKpi = summarize(baseline);
  // Exclude outage-like days (CVR collapsed below 25% of baseline — the same
  // signature detectTrackingOutage flags) so a one-day pixel outage inside the
  // recent window can't masquerade as CPA drift.
  const cleanRecent =
    baseKpi.cvr != null
      ? recent.filter(
          (m) => m.clicks === 0 || m.conversions / m.clicks > baseKpi.cvr! * 0.25,
        )
      : recent;
  const recentKpi = summarize(cleanRecent);
  if (
    recentKpi.cpa == null ||
    baseKpi.cpa == null ||
    recentKpi.spend / 7 < MIN_DAILY_SPEND
  )
    return [];

  const ratio = recentKpi.cpa / baseKpi.cpa;
  // require a consistent upward trend, not just one bad week
  const cpaSeries = lastNDays(daily, 21)
    .filter((m) => m.conversions > 0)
    .map((m) => m.spend / m.conversions);
  const trendUp = slope(cpaSeries) > 0;

  if (ratio > 1.2 && trendUp) {
    const dailyConvs = recentKpi.conversions / 7;
    const extraCostPerLead = recentKpi.cpa - baseKpi.cpa;
    return [
      {
        id: `cpadrift-${c.id}`,
        type: "cpa_drift",
        severity: "warning",
        platform: c.platform,
        campaignId: c.id,
        campaignName: c.name,
        title: `CPA drifting up: ${c.name}`,
        evidence:
          `7-day CPA is ${fmtUsd(recentKpi.cpa)} vs ${fmtUsd(baseKpi.cpa)} three weeks ago ` +
          `(+${pct(ratio - 1)}), with a consistent upward daily trend. Payout is ${fmtUsd(c.payoutPerLead)}/lead, ` +
          `so front-end margin has compressed from ${fmtUsd(c.payoutPerLead - baseKpi.cpa)} to ${fmtUsd(c.payoutPerLead - recentKpi.cpa)}/lead ` +
          `(backend email/SMS value adds ~${fmtUsd(c.backendValuePerLead)}/lead on top).`,
        window: { start: recent[0].date, end: recent[recent.length - 1].date },
        estDailyImpactUsd: Math.round(dailyConvs * extraCostPerLead),
        recommendation:
          `Audit placements and audience overlap, refresh the top creative, and test a bid cap near front-end breakeven. ` +
          `Past payout you are still list-building at ~${fmtUsd(c.backendValuePerLead)}/lead backend value — tighten and watch; ` +
          `pause only if CPA clears total lead value (${fmtUsd(c.payoutPerLead + c.backendValuePerLead)}).`,
      },
    ];
  }
  return [];
}

function detectSpendSpike(c: Campaign): Anomaly[] {
  const daily = campaignDaily(c);
  const recent = lastNDays(daily, 14);
  const med = median(daily.slice(-45, -1).map((m) => m.spend));
  const out: Anomaly[] = [];
  for (const day of recent) {
    if (med > MIN_DAILY_SPEND && day.spend > med * 2.2) {
      out.push({
        id: `spike-${c.id}-${day.date}`,
        type: "spend_spike",
        severity: "warning",
        platform: c.platform,
        campaignId: c.id,
        campaignName: c.name,
        title: `Spend spike on ${day.date}: ${c.name}`,
        evidence:
          `Spend hit ${fmtUsd(day.spend)} vs a ${fmtUsd(med)} daily median (${(day.spend / med).toFixed(1)}x). ` +
          `Configured daily budget is ${fmtUsd(c.dailyBudget)}.`,
        window: { start: day.date, end: day.date },
        estDailyImpactUsd: Math.round(day.spend - med),
        recommendation:
          "Check for a bid-strategy change, budget edit, or platform pacing bug on that date. Add a spend alert at 1.5x daily budget.",
      });
    }
  }
  return out;
}

function detectTrackingOutage(c: Campaign): Anomaly[] {
  const daily = campaignDaily(c);
  const recent = lastNDays(daily, 14);
  const baseline = daily.slice(-45, -1);
  const cvrs = baseline
    .filter((m) => m.clicks > 50)
    .map((m) => m.conversions / m.clicks);
  const cvrMean = mean(cvrs);
  const cvrSd = stddev(cvrs);
  if (!cvrMean || cvrs.length < 20) return [];

  const out: Anomaly[] = [];
  for (const day of recent) {
    if (day.clicks < 50) continue;
    const cvr = day.conversions / day.clicks;
    const z = cvrSd > 0 ? (cvr - cvrMean) / cvrSd : 0;
    // Clicks normal but conversions collapsed → tracking, not demand.
    if (z < -3 && cvr < cvrMean * 0.25) {
      const lostLeads = day.clicks * cvrMean - day.conversions;
      out.push({
        id: `outage-${c.id}-${day.date}`,
        type: "tracking_outage",
        severity: "critical",
        platform: c.platform,
        campaignId: c.id,
        campaignName: c.name,
        title: `Probable conversion-tracking outage on ${day.date}: ${c.name}`,
        evidence:
          `${day.clicks.toLocaleString()} clicks landed normally but conversion rate collapsed to ` +
          `${(cvr * 100).toFixed(2)}% vs a ${(cvrMean * 100).toFixed(2)}% baseline (z = ${z.toFixed(1)}). ` +
          `Traffic was healthy; the pixel/postback almost certainly was not.`,
        window: { start: day.date, end: day.date },
        estDailyImpactUsd: Math.round(lostLeads * c.payoutPerLead),
        recommendation:
          "Verify the conversion pixel/postback fired that day and re-upload offline conversions if the platform supports it. Add a same-day CVR z-score alert.",
      });
    }
  }
  return out;
}

function detectScaleOpportunity(c: Campaign): Anomaly[] {
  const out: Anomaly[] = [];
  for (const adSet of c.adSets) {
    const daily = lastNDays(
      adSet.ads.length === 1
        ? adSet.ads[0].metrics
        : campaignDaily({ ...c, adSets: [adSet] }),
    14,
    );
    const kpi = summarize(daily);
    if (kpi.roas == null || kpi.spend / 14 < MIN_DAILY_SPEND) continue;
    const utilization = kpi.spend / 14 / adSet.dailyBudget;
    // Strong economics + pinned at budget cap = money left on the table.
    if (kpi.roas > 2.2 && utilization > 0.93) {
      const dailyProfit = (kpi.revenue - kpi.spend) / 14;
      out.push({
        id: `scale-${adSet.id}`,
        type: "scale_opportunity",
        severity: "opportunity",
        platform: c.platform,
        campaignId: c.id,
        campaignName: c.name,
        adSetId: adSet.id,
        title: `Underfunded winner: ${adSet.name}`,
        evidence:
          `14-day ROAS is ${kpi.roas.toFixed(1)}x at ${fmtUsd(kpi.spend / 14)}/day, and spend sits at ` +
          `${pct(utilization)} of its ${fmtUsd(adSet.dailyBudget)} budget cap — it has been budget-limited ` +
          `every single day while returning ${fmtUsd(dailyProfit)}/day in profit.`,
        window: { start: daily[0].date, end: daily[daily.length - 1].date },
        estDailyImpactUsd: Math.round(dailyProfit * 0.4), // conservative incremental estimate at +40% budget
        recommendation: `Raise ${adSet.name} budget ~40% (${fmtUsd(adSet.dailyBudget)} → ${fmtUsd(adSet.dailyBudget * 1.4)}) and monitor marginal CPA for 3 days before the next step-up.`,
      });
    }
  }
  return out;
}

/* ---------- entry point ---------- */

export interface DetectOptions {
  platform?: Platform;
  severity?: AnomalySeverity;
}

export function detectAnomalies(
  opts: DetectOptions = {},
  account: Account = getAccount(),
): Anomaly[] {
  const severityRank: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    opportunity: 2,
  };
  return account.campaigns
    .filter((c) => !opts.platform || c.platform === opts.platform)
    .flatMap((c) => [
      ...detectCreativeFatigue(c),
      ...detectCpaDrift(c),
      ...detectSpendSpike(c),
      ...detectTrackingOutage(c),
      ...detectScaleOpportunity(c),
    ])
    .filter((a) => !opts.severity || a.severity === opts.severity)
    .sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] ||
        b.estDailyImpactUsd - a.estDailyImpactUsd,
    );
}
