import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getAccount } from "@/lib/data/generate";
import {
  PLATFORMS,
  Platform,
  campaignDaily,
  lastNDays,
  summarize,
} from "@/lib/data/types";
import { Anomaly, detectAnomalies } from "@/lib/detect";

/**
 * One tool registry, two consumers: the Claude chat agent (/api/chat) and the
 * MCP server (/api/mcp). Tools are read-only analytics over the account plus
 * action *proposals* — nothing here ever mutates spend. Execution is a
 * human-approved queue in the UI (and would be a platform-API adapter in prod).
 */

const platformEnum = z.enum(PLATFORMS as [Platform, ...Platform[]]);

const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

function kpiRow(label: string, metrics: ReturnType<typeof summarize>) {
  return {
    label,
    spend: r2(metrics.spend),
    conversions: metrics.conversions,
    revenue: r2(metrics.revenue),
    cpa: r2(metrics.cpa),
    roas: r2(metrics.roas),
    ctr: metrics.ctr == null ? null : r2(metrics.ctr * 100),
  };
}

/* ---------- actions derived from anomalies ---------- */

export type ActionType =
  | "pause_ad"
  | "raise_budget"
  | "refresh_creative"
  | "fix_tracking"
  | "investigate";

export interface ProposedAction {
  id: string;
  type: ActionType;
  anomalyId: string;
  platform: Platform;
  label: string;
  target: { campaignId: string; adSetId?: string; adId?: string };
  rationale: string;
  estDailyImpactUsd: number;
  /** what the mock executor would send to the platform API */
  params: Record<string, string | number>;
}

export function proposeActions(anomalies: Anomaly[]): ProposedAction[] {
  const actions: ProposedAction[] = [];
  for (const a of anomalies) {
    const target = { campaignId: a.campaignId, adSetId: a.adSetId, adId: a.adId };
    switch (a.type) {
      case "creative_fatigue":
        actions.push({
          id: `act-pause-${a.adId}`,
          type: "pause_ad",
          anomalyId: a.id,
          platform: a.platform,
          label: `Pause ${a.adName}`,
          target,
          rationale: a.evidence,
          estDailyImpactUsd: a.estDailyImpactUsd,
          params: { adId: a.adId!, status: "PAUSED" },
        });
        actions.push({
          id: `act-refresh-${a.adId}`,
          type: "refresh_creative",
          anomalyId: a.id,
          platform: a.platform,
          label: `Brief refresh creative for ${a.campaignName}`,
          target,
          rationale: `Same angle, new hook — audience is saturated on the current creative.`,
          estDailyImpactUsd: a.estDailyImpactUsd,
          params: { campaignId: a.campaignId, count: 4 },
        });
        break;
      case "scale_opportunity": {
        const m = a.recommendation.match(/\$([\d,]+) → \$([\d,]+)/);
        actions.push({
          id: `act-scale-${a.adSetId}`,
          type: "raise_budget",
          anomalyId: a.id,
          platform: a.platform,
          label: `Raise budget: ${a.title.replace("Underfunded winner: ", "")}`,
          target,
          rationale: a.evidence,
          estDailyImpactUsd: a.estDailyImpactUsd,
          params: {
            adSetId: a.adSetId!,
            newDailyBudget: m ? Number(m[2].replace(/,/g, "")) : 0,
          },
        });
        break;
      }
      case "tracking_outage":
        actions.push({
          id: `act-track-${a.campaignId}-${a.window.start}`,
          type: "fix_tracking",
          anomalyId: a.id,
          platform: a.platform,
          label: `Verify pixel/postback for ${a.campaignName} (${a.window.start})`,
          target,
          rationale: a.evidence,
          estDailyImpactUsd: a.estDailyImpactUsd,
          params: { campaignId: a.campaignId, date: a.window.start },
        });
        break;
      default:
        actions.push({
          id: `act-inv-${a.id}`,
          type: "investigate",
          anomalyId: a.id,
          platform: a.platform,
          label: `Investigate: ${a.title}`,
          target,
          rationale: a.evidence,
          estDailyImpactUsd: a.estDailyImpactUsd,
          params: { campaignId: a.campaignId },
        });
    }
  }
  return actions;
}

/* ---------- tool registry ---------- */

export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  execute: (input: Record<string, unknown>) => unknown;
}

export const TOOLS: ToolDef[] = [
  {
    name: "get_account_overview",
    description:
      "Portfolio-level KPIs (spend, conversions, revenue, CPA, ROAS, CTR%) for the whole account and per platform, over the last N days. Call this first when asked how the account is doing.",
    schema: z.object({
      days: z.number().int().min(1).max(90).default(7).describe("Lookback window in days"),
    }),
    execute: ({ days }) => {
      const account = getAccount();
      const d = (days as number) ?? 7;
      const all = account.campaigns.map((c) => lastNDays(campaignDaily(c), d));
      const rows = PLATFORMS.map((p) =>
        kpiRow(
          p,
          summarize(
            account.campaigns
              .filter((c) => c.platform === p)
              .flatMap((c) => lastNDays(campaignDaily(c), d)),
          ),
        ),
      );
      return { windowDays: d, total: kpiRow("total", summarize(all.flat())), byPlatform: rows };
    },
  },
  {
    name: "list_campaigns",
    description:
      "List campaigns with KPIs over the last N days. Optionally filter by platform (meta, google, taboola, tiktok). Returns campaign ids usable with get_campaign_detail.",
    schema: z.object({
      platform: platformEnum.optional().describe("Filter to one ad platform"),
      days: z.number().int().min(1).max(90).default(7),
    }),
    execute: ({ platform, days }) => {
      const d = (days as number) ?? 7;
      return getAccount()
        .campaigns.filter((c) => !platform || c.platform === platform)
        .map((c) => ({
          id: c.id,
          name: c.name,
          platform: c.platform,
          vertical: c.vertical,
          dailyBudget: c.dailyBudget,
          payoutPerLead: c.payoutPerLead,
          ...kpiRow(c.name, summarize(lastNDays(campaignDaily(c), d))),
        }));
    },
  },
  {
    name: "get_campaign_detail",
    description:
      "Full detail for one campaign: daily metric series plus per-ad-set and per-ad KPIs (with headlines and angles). Use for drill-downs and before proposing changes.",
    schema: z.object({
      campaignId: z.string().describe("Campaign id from list_campaigns"),
      days: z.number().int().min(1).max(90).default(30),
    }),
    execute: ({ campaignId, days }) => {
      const c = getAccount().campaigns.find((x) => x.id === campaignId);
      if (!c) return { error: `Unknown campaignId '${campaignId}'. Call list_campaigns for valid ids.` };
      const d = (days as number) ?? 30;
      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        vertical: c.vertical,
        dailyBudget: c.dailyBudget,
        payoutPerLead: c.payoutPerLead,
        daily: lastNDays(campaignDaily(c), d),
        adSets: c.adSets.map((s) => ({
          id: s.id,
          name: s.name,
          audience: s.audience,
          dailyBudget: s.dailyBudget,
          ...kpiRow(s.name, summarize(s.ads.flatMap((a) => lastNDays(a.metrics, d)))),
          ads: s.ads.map((a) => ({
            id: a.id,
            name: a.name,
            creativeType: a.creativeType,
            headline: a.headline,
            angle: a.angle,
            status: a.status,
            avgFrequency7d: r2(
              lastNDays(a.metrics, 7).reduce((acc, m) => acc + m.frequency, 0) / 7,
            ),
            ...kpiRow(a.name, summarize(lastNDays(a.metrics, d))),
          })),
        })),
      };
    },
  },
  {
    name: "detect_anomalies",
    description:
      "Run statistical anomaly detection across the account: creative fatigue (frequency up + CTR decay), CPA drift, spend spikes, conversion-tracking outages, and underfunded winners worth scaling. Each finding includes evidence and an estimated $/day impact. This is the tool to call for 'what's wrong', 'what should I look at', or 'what should I kill/scale'.",
    schema: z.object({
      platform: platformEnum.optional(),
      severity: z.enum(["critical", "warning", "opportunity"]).optional(),
    }),
    execute: ({ platform, severity }) =>
      detectAnomalies({
        platform: platform as Platform | undefined,
        severity: severity as "critical" | "warning" | "opportunity" | undefined,
      }),
  },
  {
    name: "propose_actions",
    description:
      "Turn current anomalies into concrete, executable actions (pause ad, raise budget, fix tracking, refresh creative) with the exact platform-API params. Actions are NEVER auto-executed — they go to a human approval queue. Present these to the user with their ids so they can approve.",
    schema: z.object({
      platform: platformEnum.optional(),
    }),
    execute: ({ platform }) =>
      proposeActions(detectAnomalies({ platform: platform as Platform | undefined })),
  },
  {
    name: "get_creative_context",
    description:
      "Everything needed to write refreshed ad creative for a campaign: vertical, audience, every live headline with its angle and 7-day CTR. Call before drafting new ad copy so variants are grounded in what is and isn't working.",
    schema: z.object({
      campaignId: z.string(),
    }),
    execute: ({ campaignId }) => {
      const c = getAccount().campaigns.find((x) => x.id === campaignId);
      if (!c) return { error: `Unknown campaignId '${campaignId}'.` };
      return {
        campaign: c.name,
        platform: c.platform,
        vertical: c.vertical,
        payoutPerLead: c.payoutPerLead,
        audiences: c.adSets.map((s) => s.audience),
        liveCreatives: c.adSets.flatMap((s) =>
          s.ads.map((a) => {
            const kpi = summarize(lastNDays(a.metrics, 7));
            return {
              name: a.name,
              type: a.creativeType,
              headline: a.headline,
              angle: a.angle,
              ctr7dPct: kpi.ctr == null ? null : r2(kpi.ctr * 100),
              cpa7d: r2(kpi.cpa),
            };
          }),
        ),
        note: "Compliance: this is lead-gen for regulated verticals — avoid guarantees ('will cut your bill'), fake urgency with dates, and unsubstantiated dollar claims.",
      };
    },
  },
  {
    name: "generate_briefing",
    description:
      "Structured data for a morning briefing: yesterday vs trailing 7-day baseline per platform, all current anomalies, and proposed actions. Use when asked for a daily digest, standup summary, or 'what changed'.",
    schema: z.object({}),
    execute: () => {
      const account = getAccount();
      const anomalies = detectAnomalies();
      const perPlatform = PLATFORMS.map((p) => {
        const daily = account.campaigns
          .filter((c) => c.platform === p)
          .map((c) => campaignDaily(c));
        const yesterday = summarize(daily.map((s) => s[s.length - 2]).filter(Boolean));
        const prior7 = summarize(daily.flatMap((s) => s.slice(-9, -2)));
        return {
          platform: p,
          yesterday: kpiRow("yesterday", yesterday),
          prior7dAvgSpend: r2(prior7.spend / 7),
          prior7dCpa: r2(prior7.cpa),
          prior7dRoas: r2(prior7.roas),
        };
      });
      return {
        date: new Date().toISOString().slice(0, 10),
        perPlatform,
        anomalies,
        proposedActions: proposeActions(anomalies),
      };
    },
  },
];

export function getTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Execute a tool with zod validation; returns a JSON-string tool result. */
export function runTool(name: string, input: unknown): { content: string; isError: boolean } {
  const tool = getTool(name);
  if (!tool) return { content: `Unknown tool: ${name}`, isError: true };
  const parsed = tool.schema.safeParse(input ?? {});
  if (!parsed.success) {
    return { content: `Invalid input: ${parsed.error.message}`, isError: true };
  }
  try {
    return { content: JSON.stringify(tool.execute(parsed.data)), isError: false };
  } catch (err) {
    return { content: `Tool error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}

/** Tool definitions in Anthropic Messages API shape. */
export function anthropicTools() {
  return TOOLS.map((t) => {
    const schema = zodToJsonSchema(t.schema) as Record<string, unknown>;
    delete schema.$schema;
    return {
      name: t.name,
      description: t.description,
      input_schema: schema as { type: "object"; [k: string]: unknown },
    };
  });
}
