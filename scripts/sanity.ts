import { getAccount } from "@/lib/data/generate";
import { campaignDaily, summarize, lastNDays } from "@/lib/data/types";
import { detectAnomalies } from "@/lib/detect";
import { runTool, anthropicTools } from "@/lib/tools";

const account = getAccount();
console.log("campaigns:", account.campaigns.length);
for (const c of account.campaigns) {
  const kpi = summarize(lastNDays(campaignDaily(c), 7));
  console.log(
    c.id.padEnd(24),
    "spend/d", Math.round(kpi.spend / 7),
    "CPA", kpi.cpa?.toFixed(1),
    "ROAS", kpi.roas?.toFixed(2),
    "payout", c.payoutPerLead,
  );
}
console.log("\n--- anomalies ---");
for (const a of detectAnomalies()) {
  console.log(`[${a.severity}] ${a.type} :: ${a.title} :: ~$${a.estDailyImpactUsd}/day`);
}
console.log("\n--- tools smoke ---");
console.log("tool count:", anthropicTools().length);
const overview = JSON.parse(runTool("get_account_overview", { days: 7 }).content);
console.log("overview total:", overview.total);
const actions = JSON.parse(runTool("propose_actions", {}).content);
console.log("actions:", actions.map((a: { type: string; label: string }) => `${a.type} :: ${a.label}`));
