---
paths:
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
---
# Frontend Patterns for Altaviz

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5.9.3
- Tailwind CSS v4 + shadcn/ui
- SWR for data fetching with 30-60s refresh intervals
- NextAuth.js v5 for authentication
- Stripe for billing (Free/Pro/Enterprise tiers)

## Route Structure
- `(marketing)` group — public pages (landing, pricing, about, changelog)
- `(dashboard)` group — auth-required pages (fleet, alerts, agents)
- `(auth)` group — login page
- `api/` — 26+ org-scoped API routes

## Conventions
- Use App Router (`app/` directory), never Pages Router
- API routes must validate organization_id from session
- Use SWR hooks in `hooks/` directory (useFleetHealth, useAlerts, useAgents)
- Agent API calls proxy through Next.js to FastAPI sidecar (port 8001)

## Security
- Rate limiting: 60 req/min general, 10 req/min auth
- CSP headers configured in next.config.ts
- Input validation on all API routes via `lib/validation.ts`
- Parameterized SQL queries only (never string interpolation)
- Timing-safe comparison for API keys via `lib/crypto.ts`
- Audit logging to database for sensitive operations

## Component Organization
- `components/agents/` — ConfidenceBadge, StatusPill, EvidenceChain, WorkOrderCard
- `components/marketing/` — Hero, AgentFlowDemo, ClosedLoopDiagram, LiveDemoTeaser
- `components/dashboard/` — Fleet overview components
- `components/ui/` — shadcn/ui primitives (Button, Card, Dialog, etc.)
