import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/lib/data/generate";
import {
  PLATFORM_LABELS,
  campaignDaily,
  lastNDays,
  summarize,
} from "@/lib/data/types";
import { detectAnomalies } from "@/lib/detect";
import { num, pctStr, usd } from "@/lib/format";
import { CpaChart, SpendLeadsChart } from "@/components/campaign-charts";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = getAccount().campaigns.find((c) => c.id === id);
  if (!campaign) notFound();

  const daily = lastNDays(campaignDaily(campaign), 30);
  const kpi = summarize(lastNDays(daily, 7));
  const anomalies = detectAnomalies().filter((a) => a.campaignId === id);

  return (
    <div className="dash min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0d12]/85 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/app" className="navlink text-xs text-slate-400 transition hover:text-slate-200">
            ← Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-sm font-semibold text-slate-100">{campaign.name}</h1>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-slate-400">
            {PLATFORM_LABELS[campaign.platform]} · {campaign.vertical}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Spend (7d)", value: usd(kpi.spend) },
            { label: "Leads (7d)", value: num(kpi.conversions) },
            { label: "CPA", value: usd(kpi.cpa, 2) },
            { label: "Payout/lead", value: usd(campaign.payoutPerLead) },
            { label: "ROAS", value: kpi.roas ? `${kpi.roas.toFixed(2)}x` : "—" },
          ].map((k) => (
            <div key={k.label} className="dash-card lift rounded-2xl p-3.5">
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{k.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-50">{k.value}</div>
            </div>
          ))}
        </div>

        {anomalies.length > 0 && (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className="dash-card rounded-2xl border-l-2 !border-l-amber-400 p-3.5 text-xs"
              >
                <span className="font-semibold text-amber-400">{a.title}</span>
                <span className="ml-2 text-slate-300">~{usd(a.estDailyImpactUsd)}/day</span>
                <p className="mt-1 leading-relaxed text-slate-400">{a.evidence}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="dash-card rounded-2xl p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Spend & leads (30d)
            </h2>
            <SpendLeadsChart daily={daily} />
          </section>
          <section className="dash-card rounded-2xl p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              CPA vs payout (30d)
            </h2>
            <CpaChart daily={daily} payoutPerLead={campaign.payoutPerLead} />
          </section>
        </div>

        {campaign.adSets.map((s) => (
          <section key={s.id} className="dash-card overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
              <div>
                <h2 className="text-sm font-medium text-slate-200">{s.name}</h2>
                <div className="text-[11px] text-slate-500">{s.audience}</div>
              </div>
              <div className="text-xs text-slate-400">budget {usd(s.dailyBudget)}/day</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-2 font-medium">Ad</th>
                    <th className="px-3 py-2 font-medium">Headline</th>
                    <th className="px-3 py-2 text-right font-medium">CTR (7d)</th>
                    <th className="px-3 py-2 text-right font-medium">Freq (7d)</th>
                    <th className="px-3 py-2 text-right font-medium">CPA (7d)</th>
                    <th className="px-4 py-2 text-right font-medium">Spend (7d)</th>
                  </tr>
                </thead>
                <tbody>
                  {s.ads.map((ad) => {
                    const adKpi = summarize(lastNDays(ad.metrics, 7));
                    const freq =
                      lastNDays(ad.metrics, 7).reduce((acc, m) => acc + m.frequency, 0) / 7;
                    return (
                      <tr key={ad.id} className="border-b border-white/[0.04] text-slate-300 transition-colors last:border-0 hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-200">{ad.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {ad.creativeType} · angle: {ad.angle}
                          </div>
                        </td>
                        <td className="max-w-56 px-3 py-2.5 text-slate-400">{ad.headline}</td>
                        <td className="px-3 py-2.5 text-right">{pctStr(adKpi.ctr, 2)}</td>
                        <td className={`px-3 py-2.5 text-right ${freq > 3.2 ? "text-red-400" : ""}`}>
                          {freq.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right">{usd(adKpi.cpa, 2)}</td>
                        <td className="px-4 py-2.5 text-right">{usd(adKpi.spend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
