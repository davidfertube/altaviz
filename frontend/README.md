# Altaviz Frontend

Next.js 16 + React 19 frontend for Altaviz, a pipeline integrity management platform for midstream oil & gas operators.

## Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Requires a `DATABASE_URL` environment variable pointing to PostgreSQL (Supabase). See `.env.example` in the project root for all environment variables.

## Key Commands

```bash
npm install                 # Install dependencies
npm run dev                 # Dev server (localhost:3000)
npm run build               # Production build
npm test                    # Run tests (234 tests, 30 suites)
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npx tsc --noEmit            # TypeScript type check
```

## Routes

### Marketing (public)

| Route | Description |
|-------|-------------|
| `/` | Landing page (pipeline integrity, animated counters, gradient CTAs) |
| `/pricing` | Pricing comparison (Free / Pro $49 / Enterprise $199) |
| `/about` | Company story, mission, values |
| `/contact` | Contact form + sales info |
| `/changelog` | Product updates timeline |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/security` | Security policy + compliance |

### Auth

| Route | Description |
|-------|-------------|
| `/login` | Auth page (GitHub + Google OAuth + dev credentials) |

### Demo (public, no auth required)

| Route | Description |
|-------|-------------|
| `/demo` | Fleet Overview (simulated data) |
| `/demo/monitoring` | Monitoring Grid |
| `/demo/monitoring/[id]` | Pipeline Detail (gauges, trends, ML predictions) |
| `/demo/alerts` | Alert Management |
| `/demo/emissions` | EPA Emissions Monitoring |

### Dashboard (protected, requires auth)

| Route | Description |
|-------|-------------|
| `/dashboard` | Fleet Overview |
| `/dashboard/monitoring` | Monitoring Grid |
| `/dashboard/monitoring/[id]` | Pipeline Detail (radial gauges, time-series charts) |
| `/dashboard/alerts` | Alert Management (filterable, acknowledge/resolve) |
| `/dashboard/data-quality` | Pipeline Health metrics |
| `/dashboard/emissions` | EPA Emissions Monitoring |
| `/dashboard/settings` | Organization, profile, team, billing |
| `/dashboard/settings/billing` | Subscription management (Stripe) |
| `/dashboard/settings/team` | Team management (members, invites, roles) |

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **shadcn/ui** (21 base components)
- **node-postgres** (`pg`) for database
- **SWR** (data fetching with 30-60s refresh intervals)
- **NextAuth.js v5** (GitHub + Google OAuth)
- **Stripe Billing** (lazy-initialized client)
- **framer-motion** (animations)
- **Resend** (transactional email)

## Database

PostgreSQL (Supabase) connected via the `DATABASE_URL` environment variable. The frontend uses `pg` (node-postgres) through a connection pool defined in `src/lib/db.ts`.

All queries are parameterized with `$1, $2` placeholders and scoped to the authenticated user's `organization_id`. The 12 query functions in `src/lib/queries.ts` all require an `organizationId` parameter.

## Project Structure

```
src/
├── app/
│   ├── (marketing)/             # Public pages (landing, pricing, about, contact, changelog, legal)
│   ├── (auth)/login/            # Auth page
│   ├── (dashboard)/             # Protected routes
│   │   └── dashboard/
│   │       ├── monitoring/      # Pipeline grid + detail
│   │       ├── alerts/          # Alert management
│   │       ├── data-quality/    # Pipeline health
│   │       ├── emissions/       # EPA emissions
│   │       └── settings/        # Org settings, team, billing
│   ├── (demo)/                  # Public demo (no auth)
│   └── api/                     # API routes (org-scoped, validated, rate-limited)
├── components/
│   ├── ui/                      # 21 shadcn/ui base components
│   ├── marketing/               # Landing page sections
│   └── layout/                  # Header, sidebar, navigation
├── hooks/                       # SWR data fetching hooks
├── lib/
│   ├── db.ts                    # PostgreSQL pool via pg (node-postgres)
│   ├── queries.ts               # 12 org-scoped parameterized SQL query functions
│   ├── auth.ts                  # NextAuth.js v5 config
│   ├── session.ts               # getAppSession(), requireRole(), RBAC helpers
│   ├── stripe.ts                # Stripe client (lazy-init)
│   ├── email.ts                 # Transactional email via Resend API
│   ├── email-templates.ts       # HTML email templates (welcome, alerts, invites)
│   ├── workflows.ts             # 4 agentic workflows
│   ├── demo-data.ts             # Pre-seeded demo data
│   ├── audit.ts                 # Audit logging
│   ├── rate-limit.ts            # In-memory rate limiter
│   ├── plans.ts                 # Subscription plan definitions + feature gates
│   ├── validation.ts            # Input validation (int bounds, enum, UUID)
│   ├── errors.ts                # Sanitized error responses
│   ├── fetcher.ts               # SWR fetcher with retry logic
│   ├── env.ts                   # Startup env var validation
│   ├── crypto.ts                # Timing-safe comparison
│   └── types.ts                 # TypeScript interfaces
└── __tests__/                   # Test suite (30 suites, 234 tests)
    ├── api/                     # API route tests (17 test files)
    └── lib/                     # Library module tests (13 test files)
```

## Testing

234 tests across 30 suites. Coverage thresholds: 60% statements/branches/functions/lines.

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```
