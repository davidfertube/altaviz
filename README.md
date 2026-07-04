# Altaviz — AI Media Buying Copilot

**Live:** [altaviz.vercel.app](https://altaviz.vercel.app) · **MCP:** `https://altaviz.vercel.app/api/mcp`

Built by [David Fernandez](https://www.davidfernandez.dev) for the It's Today Media Build Challenge.

**60-second tour:** open the [demo](https://altaviz.vercel.app/app) → expand the Google tracking-outage finding → ask the copilot *"What should I kill today?"* → approve its actions in the queue.

## What it does

Watches a multi-platform ad account (Meta, Google, Taboola, TikTok) and closes the gap between *when something breaks* and *when a human notices*.

- **Detect** — a statistical engine (plain TypeScript, no LLM in the loop) finds the five failure modes that cost affiliate teams money: creative fatigue, CPA drift, spend spikes, conversion-tracking outages, underfunded winners. Every finding ships with evidence and a **$/day impact**.
- **Decide** — a Claude copilot (streaming tool-use agent, `claude-sonnet-5`) grounded in the same tools. *"What should I kill today?"* gets dollars, evidence, and reasoning — it knows a tracking outage means "fix the pixel", not "cut spend".
- **Act, approved** — the agent proposes typed actions with exact platform-API params. They queue for human approval. **Nothing executes without a click.**
- **MCP** — the identical tool registry is a Model Context Protocol server, so the team can drive the account from Claude Desktop, Claude Code, or Cursor.

```bash
claude mcp add --transport http altaviz https://altaviz.vercel.app/api/mcp
```

<details>
<summary>Claude Desktop / Cursor config</summary>

```json
{
  "mcpServers": {
    "altaviz": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://altaviz.vercel.app/api/mcp"]
    }
  }
}
```
</details>

**Demo data:** a deterministic seeded account — 6 campaigns, 90 days, realistic affiliate economics (CPA at 60–85% of payout), five injected anomalies. No database; every visitor sees the same story. Real platform adapters swap in behind the same `Account → Campaign → AdSet → Ad → DailyMetric` interface.

## Why this tool

Your business buys media to build email/SMS lists; ROI is the metric. The expensive failures at that scale aren't strategy — they're **detection lag**. Dashboards show numbers, not *what changed, what it costs per day, and what to do*. I chose this over a creative generator or LP builder deliberately: those make more assets; this protects margin on every dollar already being spent — and it's the class of system I've built for five years (anomaly detection on streaming data, agentic tool-use).

Design decisions:

- **Statistics, not prompts.** z-scores, trend slopes, significance gates in [`lib/detect`](lib/detect/index.ts). LLMs narrate and decide; they never invent numbers. Findings are reproducible and auditable.
- **List economics built in.** Pause/scale calls are priced on payout **plus a configurable backend $/lead** — list-building campaigns often run at front-end breakeven on purpose, and the detectors know that.
- **One tool registry, two consumers.** [`lib/tools`](lib/tools/index.ts) defines each tool once (zod schema + executor); the chat agent and MCP server both consume it.
- **Hard approval boundary.** The agent can propose `raise_budget`; it cannot call it. Product decision, not a gap.
- **Public-demo hardening:** per-IP rate limiting, capped agent turns/tokens/history.

## What I'd build next

1. **Weeks 1–2:** read-only Meta/Google Ads API adapters behind the existing interface; validate detector thresholds against incidents your buyers remember.
2. **Weeks 3–4:** scheduled morning briefing to Slack with approve buttons; wire approved actions to platform APIs behind the same HITL boundary, with an audit log.
3. **Month 2:** close the creative loop — fatigue finding → refresh brief → your video-gen pipeline → upload as paused drafts via your ads MCP server.
4. **Ongoing:** eval suites — detector precision/recall on known incidents; copilot recommendations scored against what senior buyers actually did.

## Architecture

Next.js 16 · TypeScript · Tailwind · `@anthropic-ai/sdk` · `mcp-handler` · zod · React Three Fiber (hero) · Vercel.

```
lib/data/             seeded account generator + types
lib/detect/           statistical anomaly engine (pure functions)
lib/tools/            ONE zod tool registry → consumed by both ↓
app/api/chat/         streaming Claude agent loop (NDJSON)
app/api/[transport]/  MCP server (Streamable HTTP)
app/app/              dashboard · app/  landing
```

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev   # everything but chat works without a key
npx tsx scripts/sanity.ts                  # prints KPIs + anomaly findings, no server
```

**Known limits (deliberate for a demo):** in-memory rate limiting (per serverless instance); chat history replays as text only; MCP is unauthenticated read-only demo data.
