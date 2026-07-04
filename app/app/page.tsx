import Link from "next/link";
import type { Metadata } from "next";
import { getAccount } from "@/lib/data/generate";
import {
  PLATFORM_LABELS,
  campaignDaily,
  lastNDays,
  summarize,
} from "@/lib/data/types";
import { detectAnomalies } from "@/lib/detect";
import { delta, num, usd } from "@/lib/format";
import ChatPanel from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Altaviz — Media Buying Copilot",
  description: "AI copilot and anomaly detection for cross-platform media buying.",
};

export const dynamic = "force-dynamic";

const SEVERITY_STYLES: Record<string, { badge: string; border: string; label: string }> = {
  critical: {
    badge: "bg-red-950 text-red-400",
    border: "border-red-900/60",
    label: "Critical",
  },
  warning: {
    badge: "bg-amber-950 text-amber-400",
    border: "border-amber-900/50",
    label: "Warning",
  },
  opportunity: {
    badge: "bg-emerald-950 text-emerald-400",
    border: "border-emerald-900/50",
    label: "Opportunity",
  },
};

export default function DashboardPage() {
  const account = getAccount();
  const anomalies = detectAnomalies();

  const dailyAll = account.campaigns.map((c) => campaignDaily(c));
  const cur = summarize(dailyAll.flatMap((s) => lastNDays(s, 7)));
  const prev = summarize(dailyAll.flatMap((s) => s.slice(-14, -7)));
  const profitCur = cur.revenue - cur.spend;
  const profitPrev = prev.revenue - prev.spend;

  const kpis = [
    { label: "Spend (7d)", value: usd(cur.spend), d: delta(cur.spend, prev.spend), invert: false },
    { label: "Revenue (7d)", value: usd(cur.revenue), d: delta(cur.revenue, prev.revenue), invert: false },
    { label: "Profit (7d)", value: usd(profitCur), d: delta(profitCur, profitPrev), invert: false },
    { label: "ROAS", value: cur.roas ? `${cur.roas.toFixed(2)}x` : "—", d: delta(cur.roas, prev.roas), invert: false },
    { label: "CPA", value: usd(cur.cpa, 2), d: delta(cur.cpa, prev.cpa), invert: true },
    { label: "Leads (7d)", value: num(cur.conversions), d: delta(cur.conversions, prev.conversions), invert: false },
  ];

  const campaigns = account.campaigns.map((c) => {
    const daily = campaignDaily(c);
    const kpi = summarize(lastNDays(daily, 7));
    const prevKpi = summarize(daily.slice(-14, -7));
    return { c, kpi, cpaDelta: delta(kpi.cpa, prevKpi.cpa) };
  });

  return (
    <div className="dash min-h-screen">
      <header className="border-b border-slate-800/80 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-100">
              altaviz<span className="text-sky-500">.</span>
            </Link>
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
              demo account · seeded data
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/#mcp" className="transition hover:text-slate-200">
              MCP server
            </Link>
            <a
              href="https://github.com/davidfertube/altaviz"
              className="transition hover:text-slate-200"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-800 bg-[#0d1420] p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">{k.label}</div>
              <div className="mt-1 text-xl font-semibold text-slate-100">{k.value}</div>
              {k.d && (
                <div
                  className={`mt-0.5 text-xs ${
                    k.d.startsWith("+") !== k.invert ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {k.d} vs prior 7d
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Anomaly feed */}
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-slate-200">
                  Anomaly feed
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    statistical detection · not LLM-generated
                  </span>
                </h2>
                <span className="text-xs text-slate-500">{anomalies.length} findings</span>
              </div>
              <div className="space-y-3">
                {anomalies.map((a) => {
                  const s = SEVERITY_STYLES[a.severity];
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border ${s.border} bg-[#0d1420] p-4`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
                          {s.label}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          {PLATFORM_LABELS[a.platform]}
                        </span>
                        <span className="ml-auto text-xs font-semibold text-slate-300">
                          ~{usd(a.estDailyImpactUsd)}/day
                        </span>
                      </div>
                      <Link
                        href={`/app/campaigns/${a.campaignId}`}
                        className="mt-2 block text-sm font-medium text-slate-100 transition hover:text-sky-400"
                      >
                        {a.title}
                      </Link>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.evidence}</p>
                      <p className="mt-2 text-xs leading-relaxed text-sky-500/90">
                        → {a.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Campaign table */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-200">Campaigns (last 7 days)</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0d1420]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 font-medium">Campaign</th>
                      <th className="px-3 py-2.5 font-medium">Platform</th>
                      <th className="px-3 py-2.5 text-right font-medium">Spend</th>
                      <th className="px-3 py-2.5 text-right font-medium">Leads</th>
                      <th className="px-3 py-2.5 text-right font-medium">CPA</th>
                      <th className="px-3 py-2.5 text-right font-medium">Payout</th>
                      <th className="px-3 py-2.5 text-right font-medium">ROAS</th>
                      <th className="px-4 py-2.5 text-right font-medium">CPA Δ 7d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(({ c, kpi, cpaDelta }) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-800/60 text-slate-300 last:border-0 hover:bg-slate-900/40"
                      >
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/app/campaigns/${c.id}`}
                            className="font-medium text-slate-200 transition hover:text-sky-400"
                          >
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-slate-500">{c.vertical}</div>
                        </td>
                        <td className="px-3 py-2.5">{PLATFORM_LABELS[c.platform]}</td>
                        <td className="px-3 py-2.5 text-right">{usd(kpi.spend)}</td>
                        <td className="px-3 py-2.5 text-right">{num(kpi.conversions)}</td>
                        <td className="px-3 py-2.5 text-right">{usd(kpi.cpa, 2)}</td>
                        <td className="px-3 py-2.5 text-right">{usd(c.payoutPerLead)}</td>
                        <td
                          className={`px-3 py-2.5 text-right font-medium ${
                            (kpi.roas ?? 0) >= 1.2
                              ? "text-emerald-400"
                              : (kpi.roas ?? 0) >= 1
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {kpi.roas ? `${kpi.roas.toFixed(2)}x` : "—"}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right ${
                            cpaDelta?.startsWith("+") ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {cpaDelta ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Chat */}
          <div className="h-[75vh] lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)]">
            <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
