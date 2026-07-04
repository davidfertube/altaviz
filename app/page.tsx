import Link from "next/link";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import GemPlaceholder from "@/components/gem-placeholder";
import { detectAnomalies } from "@/lib/detect";
import { CountUp, Reveal, Spotlight } from "@/components/motion";

const HeroGlass = dynamic(() => import("@/components/hero-glass"), {
  loading: () => <GemPlaceholder />,
});

export const metadata: Metadata = {
  title: "Altaviz — AI Media Buying Copilot",
  description:
    "Statistical anomaly detection, a Claude-powered copilot, and an MCP server for cross-platform media buying teams.",
};

const FEATURES = [
  {
    title: "Detect",
    body: "Statistical detection over every campaign — creative fatigue, CPA drift, spend spikes, tracking outages, underfunded winners. Every finding priced in $/day.",
    tag: "z-scores · trend slopes · significance gates",
  },
  {
    title: "Decide",
    body: "A Claude copilot grounded in the same tools as the dashboard. Ask \"what should I kill today?\" — get dollars, evidence, and the why.",
    tag: "claude · tool-calling agent",
  },
  {
    title: "Act, approved",
    body: "Typed actions with exact platform-API params, queued for human approval. An agent never spends money unattended.",
    tag: "human-in-the-loop · never auto-executes",
  },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "altaviz": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "https://altaviz.vercel.app/api/mcp"]
    }
  }
}`;

export default function LandingPage() {
  const dailyImpact = Math.round(
    detectAnomalies().reduce((a, x) => a + x.estDailyImpactUsd, 0),
  );
  return (
    <div className="min-h-screen w-full overflow-x-clip">
      {/* floating pill nav */}
      <header className="sticky top-4 z-50 mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between rounded-full border border-[#e7e7ea] bg-white/80 py-2.5 pl-5 pr-2.5 shadow-[0_1px_12px_rgba(22,24,28,0.04)] backdrop-blur-xl">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            altaviz<span className="text-[#2e4dff]">.</span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px] text-neutral-500">
            <a href="#product" className="navlink hidden transition hover:text-neutral-900 sm:block">
              Product
            </a>
            <a href="#mcp" className="navlink hidden transition hover:text-neutral-900 sm:block">
              MCP
            </a>
            <a
              href="https://github.com/davidfertube/altaviz"
              className="navlink transition hover:text-neutral-900"
            >
              GitHub
            </a>
            <Link
              href="/app"
              className="arrow-btn rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Open demo <span className="arrow">→</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* hero — centered, gem in the middle */}
      <section className="grain relative mx-auto max-w-5xl px-6 pt-14 text-center sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-64 h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(46,77,255,0.16), rgba(46,77,255,0.05), transparent)",
          }}
        />
        <Reveal>
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#2e4dff]">
            AI media buying copilot
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mx-auto mt-4 max-w-3xl text-balance text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-6xl">
            Catch the anomaly before it eats your margin.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-500">
            Altaviz watches every campaign across Meta, Google, Taboola, and
            TikTok — finds what broke, prices it in dollars, and drafts the fix
            for your approval.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="arrow-btn whitespace-nowrap rounded-full bg-[#2e4dff] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(46,77,255,0.28)] transition-colors hover:bg-[#2440e0]"
            >
              Open the live demo <span className="arrow">→</span>
            </Link>
            <a
              href="#mcp"
              className="whitespace-nowrap rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
            >
              Use it from Claude
            </a>
          </div>
        </Reveal>

        {/* the gem */}
        <Reveal delay={320}>
          <div className="relative mx-auto mt-4 h-[340px] w-full max-w-2xl sm:h-[420px]">
            <HeroGlass />
          </div>
        </Reveal>

        {/* stat strip */}
        <Reveal delay={80}>
          <div className="mx-auto -mt-4 grid max-w-3xl grid-cols-3 divide-x divide-[#e7e7ea] rounded-2xl border border-[#e7e7ea] bg-white py-5">
            {[
              { v: 5, suffix: "", label: "anomaly detectors" },
              { v: 7, suffix: "", label: "agent + MCP tools" },
              { v: dailyImpact, suffix: "", prefix: "$", label: "per day surfaced in the demo" },
            ].map((s) => (
              <div key={s.label} className="px-2 sm:px-3">
                <div className="text-lg font-semibold tabular-nums tracking-tight sm:text-3xl">
                  <CountUp value={s.v} prefix={s.prefix ?? ""} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500 sm:text-xs">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 60-second tour */}
        <Reveal delay={140}>
          <div className="mx-auto mt-4 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            {[
              { n: "1", t: "Open the demo", d: "The engine has already found every problem in the account \u2014 priced per day." },
              { n: "2", t: "Expand a finding", d: "Statistical evidence, no LLM guesses: the Google outage, the fatigued solar ad." },
              { n: "3", t: "Ask, then approve", d: "\u201CWhat should I kill today?\u201D \u2014 approve the copilot\u2019s actions in the queue." },
            ].map((x) => (
              <div key={x.n} className="rounded-2xl border border-[#e7e7ea] bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2e4dff]/10 text-[11px] font-semibold text-[#2e4dff]">
                    {x.n}
                  </span>
                  <span className="text-[13px] font-semibold">{x.t}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">{x.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:gap-14">
          <Reveal>
            <h2 className="text-pretty text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              Media buying teams lose money in the gap between{" "}
              <em className="text-[#2e4dff] not-italic">broken</em> and{" "}
              <em className="text-[#2e4dff] not-italic">noticed</em>.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-4 text-[15px] leading-relaxed text-neutral-500">
              <p>
                A fatigued creative quietly doubles CPA. A tracking outage burns a
                day of spend while dashboards look normal. A winner sits
                budget-capped because scaling it was nobody&apos;s job that week.
              </p>
              <p>
                At affiliate scale that detection lag is a permanent tax on ROI.
                Dashboards show numbers — not{" "}
                <span className="text-neutral-800">
                  what changed, what it costs, and what to do
                </span>
                . Altaviz closes that gap.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* product cards */}
      <section id="product" className="scroll-mt-24 border-y border-[#e7e7ea] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-[13px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              What it does
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <Spotlight className="lift h-full rounded-3xl border border-[#e7e7ea] bg-[#fafafa] p-7 hover:border-neutral-300">
                  <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-neutral-500">
                    {f.body}
                  </p>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-[#2e4dff]">
                    {f.tag}
                  </p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MCP */}
      <section id="mcp" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 sm:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="text-pretty text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                The same tools, from Claude or Cursor.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-4 text-[15px] leading-relaxed text-neutral-500">
                Everything behind the copilot is an{" "}
                <span className="text-neutral-800">MCP server</span> at{" "}
                <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[13px]">
                  /api/mcp
                </code>
                . Plug the account into the AI tools your team already uses.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
                Claude Code:{" "}
                <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[12px] text-neutral-600">
                  claude mcp add --transport http altaviz
                  https://altaviz.vercel.app/api/mcp
                </code>
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <Spotlight
              className="lift rounded-3xl border border-neutral-800 bg-[#0e131b] p-6"
              spot="rgba(96,165,250,0.10)"
            >
              <div className="mb-3 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              </div>
              <pre className="overflow-x-auto font-mono text-[12.5px] leading-relaxed text-slate-200">
                {MCP_CONFIG}
              </pre>
            </Spotlight>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-[#e7e7ea]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-10 text-[13px] text-neutral-400">
          <span>
            Built by{" "}
            <a
              href="https://www.davidfernandez.dev"
              className="font-medium text-neutral-600 transition hover:text-neutral-900"
            >
              David Fernandez
            </a>{" "}
            · It&apos;s Today Media Build Challenge, July 2026
          </span>
          <span className="flex gap-5">
            <a href="https://github.com/davidfertube/altaviz" className="navlink transition hover:text-neutral-900">
              GitHub
            </a>
            <a href="mailto:davidfertube@gmail.com" className="navlink transition hover:text-neutral-900">
              Contact
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
