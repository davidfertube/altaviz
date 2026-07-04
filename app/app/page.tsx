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
import { CountUp, Reveal, Spotlight } from "@/components/motion";

export const metadata: Metadata = {
  title: "Altaviz — Dashboard",
  description: "AI copilot and anomaly detection for cross-platform media buying.",
};

export const dynamic = "force-dynamic";

const SEVERITY: Record<
  string,
  { badge: string; accent: string; label: string; spot: string }
> = {
  critical: {
    badge: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20",
    accent: "bg-red-500",
    label: "Critical",
    spot: "rgba(239,68,68,0.07)",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20",
    accent: "bg-amber-400",
    label: "Warning",
    spot: "rgba(245,158,11,0.07)",
  },
  opportunity: {
    badge: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
    accent: "bg-emerald-400",
    label: "Opportunity",
    spot: "rgba(16,185,129,0.07)",
  },
};

function roasTone(roas: number | null) {
  if (roas == null) return "text-slate-400";
  if (roas >= 1.2) return "text-emerald-400";
  if (roas >= 1) return "text-amber-400";
  return "text-red-400";
}

export default function DashboardPage() {
  const account = getAccount();
  const anomalies = detectAnomalies();

  const dailyAll = account.campaigns.map((c) => campaignDaily(c));
  const cur = summarize(dailyAll.flatMap((s) => lastNDays(s, 7)));
  const prev = summarize(dailyAll.flatMap((s) => s.slice(-14, -7)));
  const profitCur = cur.revenue - cur.spend;
  const profitPrev = prev.revenue - prev.spend;

  const kpis = [
    { label: "Spend · 7d", value: cur.spend, prefix: "$", d: delta(cur.spend, prev.spend), invert: false },
    { label: "Revenue · 7d", value: cur.revenue, prefix: "$", d: delta(cur.revenue, prev.revenue), invert: false },
    { label: "Profit · 7d", value: profitCur, prefix: "$", d: delta(profitCur, profitPrev), invert: false },
    { label: "ROAS", value: cur.roas ?? 0, suffix: "x", decimals: 2, d: delta(cur.roas, prev.roas), invert: false },
    { label: "CPA", value: cur.cpa ?? 0, prefix: "$", decimals: 2, d: delta(cur.cpa, prev.cpa), invert: true },
    { label: "Leads · 7d", value: cur.conversions, d: delta(cur.conversions, prev.conversions), invert: false },
  ];

  const campaigns = account.campaigns.map((c) => {
    const daily = campaignDaily(c);
    const kpi = summarize(lastNDays(daily, 7));
    const prevKpi = summarize(daily.slice(-14, -7));
    return { c, kpi, cpaDelta: delta(kpi.cpa, prevKpi.cpa) };
  });

  return (
    <div className="dash min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0d12]/85 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="text-[15px] font-semibold tracking-tight text-slate-100">
              altaviz<span className="text-[#5b76ff]">.</span>
            </Link>
            <span className="hidden rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-slate-400 sm:inline">
              demo account · seeded data
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/#mcp" className="navlink transition hover:text-slate-100">
              MCP
            </Link>
            <a
              href="https://github.com/davidfertube/altaviz"
              className="navlink transition hover:text-slate-100"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, i) => (
            <Reveal key={k.label} delay={i * 50}>
              <Spotlight className="dash-card lift rounded-2xl p-4">
                <div className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  {k.label}
                </div>
                <div className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-50 sm:text-[22px]">
                  <CountUp
                    value={k.value}
                    prefix={k.prefix ?? ""}
                    suffix={k.suffix ?? ""}
                    decimals={k.decimals ?? 0}
                  />
                </div>
                {k.d && (
                  <div
                    className={`mt-1 text-[11px] tabular-nums ${
                      k.d.startsWith("+") !== k.invert ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {k.d} <span className="text-slate-500">vs prior 7d</span>
                  </div>
                )}
              </Spotlight>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-8 lg:col-span-2">
            {/* Anomaly feed */}
            <section>
              <Reveal>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Anomaly feed
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      statistical · not LLM-generated
                    </span>
                  </h2>
                  <span className="text-xs tabular-nums text-slate-500">
                    {anomalies.length} findings ·{" "}
                    {usd(anomalies.reduce((a, x) => a + x.estDailyImpactUsd, 0))}/day
                  </span>
                </div>
              </Reveal>
              <div className="space-y-3">
                {anomalies.map((a, i) => {
                  const s = SEVERITY[a.severity];
                  return (
                    <Reveal key={a.id} delay={i * 60}>
                      <Spotlight spot={s.spot} className="dash-card lift group relative overflow-hidden rounded-2xl">
                        <span className={`absolute inset-y-0 left-0 w-[3px] ${s.accent}`} />
                        <details className="group/d">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-4 pl-5 [&::-webkit-details-marker]:hidden">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.badge}`}>
                              {s.label}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                              {PLATFORM_LABELS[a.platform]}
                            </span>
                            <span className="ml-auto whitespace-nowrap text-xs font-semibold tabular-nums text-slate-200">
                              ~{usd(a.estDailyImpactUsd)}/day
                            </span>
                            <span className="min-w-full text-pretty text-sm font-medium leading-snug text-slate-100">
                              {a.title}
                              <span className="ml-2 inline-block text-slate-500 transition-transform duration-300 group-open/d:rotate-180">
                                ⌄
                              </span>
                            </span>
                          </summary>
                          <div className="space-y-2.5 px-5 pb-4 pt-0">
                            <p className="text-pretty text-[13px] leading-relaxed text-slate-400">
                              {a.evidence}
                            </p>
                            <p className="text-pretty text-[13px] leading-relaxed text-[#7d93ff]">
                              → {a.recommendation}
                            </p>
                            <Link
                              href={`/app/campaigns/${a.campaignId}`}
                              className="arrow-btn inline-block text-xs font-medium text-slate-300 transition hover:text-white"
                            >
                              Open campaign <span className="arrow">→</span>
                            </Link>
                          </div>
                        </details>
                      </Spotlight>
                    </Reveal>
                  );
                })}
              </div>
            </section>

            {/* Campaigns */}
            <section>
              <Reveal>
                <h2 className="mb-3 text-sm font-semibold text-slate-200">
                  Campaigns
                  <span className="ml-2 text-xs font-normal text-slate-500">last 7 days</span>
                </h2>
              </Reveal>

              {/* mobile: stacked cards */}
              <div className="space-y-3 md:hidden">
                {campaigns.map(({ c, kpi, cpaDelta }, i) => (
                  <Reveal key={c.id} delay={i * 50}>
                    <Link href={`/app/campaigns/${c.id}`} className="block">
                      <Spotlight className="dash-card lift rounded-2xl p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-pretty text-sm font-medium text-slate-100">
                              {c.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {PLATFORM_LABELS[c.platform]} · {c.vertical}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${roasTone(kpi.roas)}`}>
                            {kpi.roas ? `${kpi.roas.toFixed(2)}x` : "—"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          {[
                            { l: "Spend", v: usd(kpi.spend) },
                            { l: "Leads", v: num(kpi.conversions) },
                            { l: "CPA", v: usd(kpi.cpa, 2) },
                          ].map((x) => (
                            <div key={x.l} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                              <div className="text-[10px] uppercase tracking-wide text-slate-500">{x.l}</div>
                              <div className="text-[13px] font-medium tabular-nums text-slate-200">{x.v}</div>
                            </div>
                          ))}
                        </div>
                        {cpaDelta && (
                          <div
                            className={`mt-2 text-[11px] tabular-nums ${
                              cpaDelta.startsWith("+") ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            CPA {cpaDelta} vs prior 7d
                          </div>
                        )}
                      </Spotlight>
                    </Link>
                  </Reveal>
                ))}
              </div>

              {/* desktop: table */}
              <Reveal className="hidden md:block">
                <div className="dash-card overflow-x-auto rounded-2xl">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-4 py-3 font-medium">Campaign</th>
                        <th className="px-3 py-3 font-medium">Platform</th>
                        <th className="px-3 py-3 text-right font-medium">Spend</th>
                        <th className="px-3 py-3 text-right font-medium">Leads</th>
                        <th className="px-3 py-3 text-right font-medium">CPA</th>
                        <th className="px-3 py-3 text-right font-medium">Payout</th>
                        <th className="px-3 py-3 text-right font-medium">ROAS</th>
                        <th className="px-4 py-3 text-right font-medium">CPA Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(({ c, kpi, cpaDelta }) => (
                        <tr
                          key={c.id}
                          className="border-b border-white/[0.04] text-slate-300 transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/app/campaigns/${c.id}`}
                              className="font-medium text-slate-200 transition hover:text-[#7d93ff]"
                            >
                              {c.name}
                            </Link>
                            <div className="text-[11px] text-slate-500">{c.vertical}</div>
                          </td>
                          <td className="px-3 py-3">{PLATFORM_LABELS[c.platform]}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{usd(kpi.spend)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{num(kpi.conversions)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{usd(kpi.cpa, 2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{usd(c.payoutPerLead)}</td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums ${roasTone(kpi.roas)}`}>
                            {kpi.roas ? `${kpi.roas.toFixed(2)}x` : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums ${
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
              </Reveal>
            </section>
          </div>

          {/* Chat */}
          <div className="h-[75vh] min-w-0 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-6rem)]">
            <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
