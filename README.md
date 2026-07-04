# Altaviz — AI Media Buying Copilot

**Live demo:** [altaviz.app](https://altaviz.app) · **MCP server:** `https://altaviz.app/api/mcp`

Built by [David Fernandez](https://www.davidfernandez.dev) for the It's Today Media Build Challenge, July 2026.

---

## What it does

Altaviz watches a multi-platform media buying account (Meta, Google, Taboola, TikTok) and closes the gap between *when something breaks* and *when a human notices*:

1. **Detect** — a statistical anomaly engine (plain TypeScript, no LLM in the loop) scans every campaign for the five failure modes that actually cost affiliate teams money:
   - **Creative fatigue** — frequency climbing while CTR decays vs. a trailing baseline
   - **CPA drift** — margin compression with a consistent upward trend, checked against the per-lead payout
   - **Spend spikes** — single days far above the campaign's trailing median
   - **Conversion-tracking outages** — clicks normal, conversions collapsed (CVR z-score < −3): traffic is fine, the pixel isn't
   - **Underfunded winners** — high-ROAS ad sets pinned at their budget cap every day

   Every finding carries plain-language evidence and an **estimated $/day impact**, because media buyers act on dollars, not percentages.

2. **Decide** — a Claude-powered copilot (streaming tool-use agent) grounded in the same data. Ask *"what should I kill today?"* and it runs detection, quantifies the answer in dollars, and explains the why. It drafts creative-refresh variants grounded in the account's live headlines and angles, with compliance guardrails for regulated verticals.

3. **Act — with a human in the loop** — the agent proposes typed, executable actions (`pause_ad`, `raise_budget`, `fix_tracking`, …) with the exact platform-API params. They go to an approval queue; **nothing ever executes without a human click**. An agent should never spend money unattended.

4. **MCP server** — every tool behind the copilot is also exposed as a [Model Context Protocol](https://modelcontextprotocol.io) server at `/api/mcp`, so the team can drive the account from Claude Desktop, Claude Code, or Cursor — the tools you already use.

### Connect the MCP server

Claude Code (one line):

```bash
claude mcp add --transport http altaviz https://altaviz.app/api/mcp
```

Claude Desktop / Cursor (`claude_desktop_config.json` / `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "altaviz": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://altaviz.app/api/mcp"]
    }
  }
}
```

Then ask: *"Use altaviz to find anomalies and tell me what they cost per day."*

### Demo data

The account is a deterministic seeded simulation — 6 campaigns, ~90 days of daily metrics with realistic affiliate economics (CPA at 60–85% of payout, ROAS 1.0–1.7x) and five injected anomalies for the engine to find. Same seed every cold start, so the app needs **no database** and every visitor sees the same story. Swapping the generator for real platform adapters is the "what's next" — the detection engine and tool layer don't change.

---

## Why this tool

Your team buys media at scale to build email/SMS lists, and ROI is the metric. At that scale the expensive failures aren't strategy errors — they're **detection-lag errors**:

- A fatigued creative quietly doubles CPA for days before someone eyeballs the right breakdown.
- A tracking outage burns a full day of spend across platforms while dashboards look "normal-ish".
- A winning ad set sits at a $400/day cap because scaling it was nobody's explicit job that week.

Dashboards show numbers; they don't say *what changed, what it costs per day, and what to do about it*. That's the gap Altaviz closes — and it compounds: the same tool layer that answers questions in chat is an MCP surface your team can compose into any workflow (your ad-upload MCP server, morning Slack digests, creative pipelines).

I chose this over a creative generator or landing-page builder deliberately: those produce *more* assets, this one protects *margin on every dollar already being spent* — and it plays to what I've spent five years building (anomaly detection on streaming data, agentic tool-use systems).

Design choices worth calling out:

- **Detection is statistics, not prompts.** z-scores, trend slopes, and significance gates (minimum spend thresholds) in `lib/detect/`. LLMs narrate and decide; they don't invent the numbers. That keeps findings reproducible, cheap, and auditable.
- **One tool registry, two consumers.** `lib/tools/` defines each tool once (zod schema + executor); the chat agent and the MCP server both consume it. Adding a tool makes it available everywhere.
- **Hard human-approval boundary.** The agent can propose `raise_budget`, never execute it. That's a product decision, not a missing feature.
- **Key protection for a public demo:** per-IP rate limiting, capped agent turns, capped tokens, capped history.

## What I'd build next (as a full-time hire)

**Weeks 1–2 — real data.** Replace the generator with read-only adapters for the Meta Marketing API and Google Ads API (the interface is already `Account → Campaign → AdSet → Ad → DailyMetric`; the detectors and tools don't change). Backfill 90 days, validate detector thresholds against what your buyers say actually happened, and tune the significance gates on real spend levels.

**Weeks 3–4 — where the team already lives.** Morning briefing to Slack/email on a schedule with approve buttons that deep-link into the queue. Wire approved actions to the platform APIs behind the same HITL boundary (start with pause + budget changes, full audit log).

**Month 2 — close the creative loop.** Fatigue findings → refresh briefs → your video-generation pipeline → auto-upload via your ads MCP server as paused drafts → buyer approves. Detection-to-new-creative in hours instead of days.

**Ongoing — evals.** A regression suite of known incidents (fatigue cases, outages) scoring detector precision/recall, plus an agent eval set checking the copilot's recommendations against what senior buyers actually did. Ship changes to prompts/thresholds only when evals pass.

---

## Stack & architecture

Next.js 16 (App Router) · TypeScript · Tailwind · Recharts · `@anthropic-ai/sdk` (claude-sonnet-5, streaming tool use) · `mcp-handler` (MCP over Streamable HTTP) · zod. Deployed on Vercel.

```
lib/data/             types + deterministic seeded account generator
lib/detect/           statistical anomaly engine (pure functions, unit-testable)
lib/tools/            ONE tool registry (zod) → consumed by BOTH:
app/api/chat/         streaming Claude agent loop (NDJSON to the browser)
app/api/[transport]/  MCP server (Streamable HTTP)
app/app/              dashboard: KPIs, anomaly feed, drill-downs, copilot panel
app/                  landing page
```

### Run locally

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Everything except the chat works with no key at all. `npx tsx scripts/sanity.ts` prints the seeded account KPIs and the anomaly findings without starting the server.

### Honest limitations

- Rate limiting is in-memory per serverless instance (fine for a demo; production would use Redis/Upstash).
- Chat history replays as text only (the agent re-queries tools each turn — simpler and cheaper, loses some cross-turn tool context).
- The MCP server is unauthenticated read-only demo data; production would put OAuth in front of it.
