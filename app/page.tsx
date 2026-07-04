import Link from "next/link";
import type { Metadata } from "next";
import HeroWave from "@/components/hero-wave";

export const metadata: Metadata = {
  title: "Altaviz — AI Media Buying Copilot",
  description:
    "Statistical anomaly detection + a Claude-powered copilot + an MCP server for cross-platform media buying teams.",
};

const FEATURES = [
  {
    title: "Detect",
    body: "Statistical anomaly detection — not LLM vibes — over every campaign on Meta, Google, Taboola, and TikTok: creative fatigue, CPA drift, spend spikes, conversion-tracking outages, and underfunded winners. Every finding carries evidence and a $/day impact estimate.",
    tag: "z-scores · trend slopes · significance gates",
  },
  {
    title: "Decide",
    body: "A Claude-powered copilot grounded in the same tools as the dashboard. Ask \"what should I kill today?\" and get an answer in dollars, with the reasoning and the data behind it. It drafts refresh creatives grounded in what's already working.",
    tag: "claude · tool-calling agent",
  },
  {
    title: "Act — with a human in the loop",
    body: "The agent proposes typed, executable actions (pause ad, raise budget, fix tracking) with exact platform-API params. Nothing executes without approval: an agent should never spend your money unattended.",
    tag: "approval queue · never auto-executes",
  },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "altaviz": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://altaviz.vercel.app/api/mcp"]
    }
  }
}`;

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#fafaf9] text-stone-900">
      {/* nav — mirrors davidfernandez.dev's minimal header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          altaviz<span className="text-sky-600">.</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-stone-600">
          <a href="#problem" className="hidden transition hover:text-stone-900 sm:block">Problem</a>
          <a href="#product" className="hidden transition hover:text-stone-900 sm:block">Product</a>
          <a href="#mcp" className="hidden transition hover:text-stone-900 sm:block">MCP</a>
          <a
            href="https://github.com/davidfertube/altaviz"
            className="transition hover:text-stone-900"
          >
            GitHub
          </a>
          <Link
            href="/app"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Open demo
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-8">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-sky-700">
              AI media buying copilot
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Catch the anomaly before it eats your margin.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600">
              Media buying teams lose money in the gap between when something breaks
              and when a human notices. Altaviz watches every campaign across Meta,
              Google, Taboola, and TikTok — detects what changed, quantifies it in
              dollars, and drafts the fix for your approval.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/app"
                className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
              >
                Open the live demo →
              </Link>
              <a
                href="#mcp"
                className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400"
              >
                Use it from Claude
              </a>
            </div>
          </div>
          <div className="h-64 overflow-hidden rounded-2xl border border-stone-200 bg-[#0b0f14] md:h-80">
            <HeroWave />
          </div>
        </div>
      </section>

      {/* problem */}
      <section id="problem" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">
            The problem
          </h2>
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <p className="text-lg leading-relaxed text-stone-700">
              A fatigued creative quietly doubles CPA for days. A tracking outage
              burns spend across platforms before anyone spots it. A winning ad set
              stays budget-capped because nobody scaled it in time.
            </p>
            <p className="text-base leading-relaxed text-stone-600">
              At affiliate scale — dozens of campaigns, four platforms, margins of a
              few dollars per lead — that detection lag is a permanent tax on ROI.
              Dashboards show you numbers; they don&apos;t tell you{" "}
              <em>what changed, what it costs, and what to do about it</em>. That gap
              is what Altaviz closes.
            </p>
          </div>
        </div>
      </section>

      {/* product — card grid mirrors the portfolio-card structure */}
      <section id="product" className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">
          What it does
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-stone-300 hover:shadow-sm"
            >
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.body}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-sky-700">
                {f.tag}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MCP */}
      <section id="mcp" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-500">
            MCP server
          </h2>
          <div className="mt-4 grid items-start gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">
                The same tools, from Claude or Cursor.
              </h3>
              <p className="mt-3 text-base leading-relaxed text-stone-600">
                Every tool behind the copilot is also exposed as a{" "}
                <strong>Model Context Protocol server</strong> at{" "}
                <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">
                  /api/mcp
                </code>
                . Add it to Claude Desktop, Claude Code, or Cursor and ask your own
                AI about the account — anomaly detection, campaign drill-downs, and
                action proposals, wherever you already work.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Claude Code:{" "}
                <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                  claude mcp add --transport http altaviz https://altaviz.vercel.app/api/mcp
                </code>
              </p>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-stone-900 p-5 text-xs leading-relaxed text-stone-100">
              {MCP_CONFIG}
            </pre>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-10 text-sm text-stone-500">
        <span>
          Built by{" "}
          <a
            href="https://www.davidfernandez.dev"
            className="font-medium text-stone-700 hover:text-stone-900"
          >
            David Fernandez
          </a>{" "}
          for the It&apos;s Today Media Build Challenge, July 2026.
        </span>
        <span className="flex gap-4">
          <a href="https://github.com/davidfertube/altaviz" className="hover:text-stone-900">
            GitHub
          </a>
          <a href="mailto:davidfertube@gmail.com" className="hover:text-stone-900">
            Contact
          </a>
        </span>
      </footer>
    </div>
  );
}
