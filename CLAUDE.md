# Altaviz

Multi-tenant SaaS platform for predictive maintenance of natural gas compression equipment.
Stack: PySpark 3.5 + Delta Lake 3.0 | PostgreSQL 14 / Azure SQL | Next.js 16 + React 19 + Tailwind CSS v4 | NextAuth.js v5 (Azure AD) | Stripe Billing | Azure Container Apps + Terraform
Status: Production-hardened SaaS MVP — ETL pipeline, multi-tenant dashboard, auth, billing, agentic workflows, Azure IaC, comprehensive test suite (103 tests), security hardening, and CI/CD pipeline.

## Critical Rules

- NEVER use `inferSchema`; always use explicit `StructType` schemas from `src/etl/schemas.py`
- NEVER chain `.withColumn()` calls; use a single `.select()` with all new columns
- NEVER hardcode database credentials; use `${VAR:-default}` pattern via `config/database.yaml`
- NEVER commit `.env` files, `.env.local`, or `data/` directory contents
- Maintain Bronze → Silver → Gold medallion pattern; Bronze is immutable raw data
- Use `broadcast()` for joins with small tables (metadata, stations = 10 rows)
- Partition Gold layer by `date` column
- All sensor thresholds live in `config/thresholds.yaml`, not in application code
- Frontend: all SQL queries must be parameterized (never string interpolation)
- Frontend: all queries must be org-scoped via `organization_id` parameter
- Frontend: use SWR hooks for data fetching with appropriate refresh intervals
- Prerequisites: Python 3.10+, Java 11+ (for PySpark), Docker, Node.js 18+

## Branching Strategy

```
main      ← production (protected, requires PR + approval)
staging   ← pre-production validation (protected, requires PR)
develop   ← active development (default branch for PRs)
```

PR flow: `feature/xxx` → `develop` → `staging` → `main`

## Key Commands

```bash
docker-compose up -d                                     # Start PostgreSQL + Frontend
docker-compose ps                                        # Verify containers healthy
python src/data_simulator/compressor_simulator.py        # Generate 50k+ sensor readings
python src/etl/pyspark_pipeline.py                       # Run complete PySpark ETL pipeline
cd frontend && npm run dev                               # Launch frontend (dev mode, localhost:3000)
cd frontend && npm run build                             # Build frontend for production
cd frontend && npm test                                  # Run Jest tests (78 tests, 13 suites)
cd frontend && npm run test:coverage                     # Jest with coverage report
pytest tests/ -v                                         # Run pytest ETL tests (25 tests, 5 suites)
cd frontend && npx tsc --noEmit                          # TypeScript type check
cd frontend && npx eslint .                              # Lint check
cd infrastructure/terraform && terraform plan            # Preview Azure infrastructure changes
```

## Architecture

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → PostgreSQL / Azure SQL
                                                         ↓
Landing Page (/) ← Next.js 16 → Dashboard (/dashboard/*) → API Routes → DB (org-scoped)
                                     ↓
                    Auth (NextAuth v5 + Azure AD) + Stripe Billing + Agentic Workflows
                                     ↓
                    Azure Container Apps ← Terraform IaC → Key Vault + App Insights
```

- Raw Parquet/CSV in `data/raw/`
- Delta Lake tables in `data/processed/delta/{sensors_bronze,sensors_silver,sensors_gold}/`
- Database stores hourly aggregates (1hr, 4hr, 24hr windows) in `sensor_readings_agg` table
- Supports both PostgreSQL (local dev) and Azure SQL Database (cloud) via `DB_TYPE` env var
- 10 tables (7 original + organizations, users, billing_events) + 3 org-aware views
- Multi-tenant: all data access filtered by `organization_id`
- Fabric-ready: Delta Lake tables deploy directly to OneLake Lakehouses

## Route Structure

```
/ .......................... Landing page (Aave-inspired dark gradient, glass-morphism)
/pricing ................... Pricing comparison (Free / Pro $49 / Enterprise $199)
/login ..................... Auth page (Azure AD + dev credentials)
/dashboard ................. Fleet Overview (protected, requires auth)
/dashboard/monitoring ...... Monitoring Grid
/dashboard/monitoring/[id] . Compressor Detail (radial gauges, time-series charts)
/dashboard/alerts .......... Alert Management (filterable, acknowledge/resolve)
/dashboard/data-quality .... Pipeline Health metrics
/dashboard/settings ........ Organization, profile, billing link
/dashboard/settings/billing  Subscription management (Stripe checkout/portal)
```

Route groups: `(marketing)` for public pages, `(dashboard)` for authenticated pages, `(auth)` for login.

## Authentication & Multi-Tenancy

- **NextAuth.js v5** with Azure AD (Microsoft Entra ID) + dev Credentials provider
- JWT strategy enriched with `organizationId`, `organizationName`, `role`, `subscriptionTier`
- JWT expiry: 8 hours with hourly refresh (`maxAge: 8h`, `updateAge: 1h`)
- Dev credentials: requires `DEV_CREDENTIALS_ENABLED=true` + email allowlist
- Rate limiting: 60 req/min per IP on all `/api/*` routes via middleware
- Middleware protects all `/dashboard/*` routes → redirects to `/login`
- `getAppSession()` / `requireSession()` helpers in `lib/session.ts`
- Auto-creates org + user on first sign-in (`findOrCreateUser` in `lib/auth.ts`)
- Roles: `owner`, `admin`, `operator`, `viewer`
- All 12 query functions in `queries.ts` require `organizationId` parameter
- All 10+ API routes extract org from session, return 401 if unauthenticated

## Stripe Billing

- Lazy-initialized client in `lib/stripe.ts` (won't crash if STRIPE_SECRET_KEY unset)
- Plan definitions + feature gates in `lib/plans.ts`
- Tiers: Free (2 compressors, 1hr window), Pro (20, all windows), Enterprise (unlimited + ML)
- Feature gate on `/api/compressors/[id]/readings` blocks Free tier from 4hr/24hr windows
- Webhook handler processes: `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`
- `billing_events` table logs all Stripe events with idempotency (ON CONFLICT DO NOTHING)

## Agentic Workflows

Automated workflows in `lib/workflows.ts`, triggered via `POST /api/workflows/run`:

| Workflow | Action | Trigger |
|----------|--------|---------|
| `alert_escalation` | Unacknowledged warnings → critical after 4h | Cron / manual |
| `alert_auto_resolve` | Resolve alerts when sensor readings return to healthy | Cron / manual |
| `data_freshness_check` | Create staleness alerts if no data for 3h+ | Cron / manual |
| `stale_alert_cleanup` | Auto-acknowledge alerts unactioned for 7+ days | Cron / manual |

Supports session auth (dashboard) and API key auth (`x-api-key` header with timing-safe comparison) for cron/scheduler.
Thresholds configurable via env vars: `WORKFLOW_ESCALATION_HOURS`, `WORKFLOW_STALENESS_HOURS`, `WORKFLOW_CLEANUP_DAYS`.

## Azure Infrastructure (Terraform)

Files in `infrastructure/terraform/`:

| File | Resources |
|------|-----------|
| `main.tf` | Provider config, resource group, backend state |
| `variables.tf` | All input variables (secrets marked sensitive) |
| `container_app.tf` | Container Apps Environment + App (0.5 CPU, 2Gi, managed identity, auto-scale 1-5) |
| `container_registry.tf` | ACR (Basic SKU, admin disabled, managed identity pull) |
| `database.tf` | PostgreSQL Flexible Server (v14, B_Standard_B1ms, public access disabled in prod) |
| `keyvault.tf` | Key Vault + secrets (purge protection enabled, 90-day retention) |
| `monitoring.tf` | Log Analytics Workspace + Application Insights |
| `outputs.tf` | App URL, DB FQDN, Key Vault URI, App Insights connection |

Env separation: `infrastructure/terraform/envs/` with `staging.tfbackend`, `staging.tfvars`, `prod.tfbackend`, `prod.tfvars`.

CI/CD: `.github/workflows/ci.yml` (multi-job: lint+typecheck, frontend tests, python tests, build, security scan) and `deploy.yml` (staging auto-deploy, production with approval gate).

## Implementation Status

**Done:**
- `src/data_simulator/compressor_simulator.py` — 7 days of 10-min interval data for 10 compressors
- `src/etl/` — Complete PySpark pipeline: schemas, data quality (4σ outlier detection), transformations (rolling windows), database writer, orchestrator
- `config/` — database.yaml, etl_config.yaml, thresholds.yaml
- `infrastructure/sql/schema.sql` — 10 tables, 3 org-aware views, 15+ indexes, trigger function
- `infrastructure/sql/migrations/001_add_auth_and_tenancy.sql` — Auth + multi-tenancy migration
- `infrastructure/sql/migrations/002_add_org_id_to_remaining_tables.sql` — Direct org_id on alert_history, maintenance_events, data_quality_metrics
- `infrastructure/terraform/` — 8 Terraform files for full Azure deployment + env separation (staging/prod)
- `.github/workflows/` — CI (multi-job: lint, tests, build, security scan) and CD (staging auto-deploy, prod with approval)
- `frontend/` — Complete multi-tenant SaaS:
  - Aave-inspired landing page with glass-morphism cards, animated stats, framer-motion
  - Dashboard with fleet overview, monitoring, alerts, data quality, settings
  - Azure AD auth via NextAuth.js v5 + hardened dev credentials (dual guard + email allowlist)
  - Stripe billing with checkout, customer portal, webhooks, feature gates
  - Agentic workflows with externalized thresholds and batch INSERT optimization
  - Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
  - Rate limiting (60 req/min per IP), input validation, sanitized error handling
  - Timing-safe API key comparison, env validation at startup
  - Shared SWR fetcher with error handling and retry logic
  - Error boundaries (global + dashboard-scoped), branded 404 page
- `tests/` — 103 total tests:
  - Frontend: 13 Jest test suites (78 tests) — lib utilities + API routes
  - Python: 5 pytest test suites (25 tests) — schemas, data quality, transformations, database writer, integration
- `SECURITY.md`, `CONTRIBUTING.md`, `docs/RUNBOOK.md` — Enterprise documentation

**Todo:**
- `src/ml/` — LSTM model training and inference
- Cron scheduler for agentic workflows (Azure Container Apps scheduled tasks or external)
- Team member invite flow in settings
- Data retention enforcement (purge old sensor_readings_agg)
- Redis caching layer for fleet health and latest readings

## File Reference

| File | Purpose |
|------|---------|
| `config/database.yaml` | DB connection settings for PostgreSQL + Azure SQL |
| `config/etl_config.yaml` | Window sizes, Spark config, data paths |
| `config/thresholds.yaml` | Sensor normal/warning/critical ranges, station locations |
| `.env.example` | All env vars: DB, Auth, Stripe, Azure Monitor, ETL |
| `infrastructure/sql/schema.sql` | PostgreSQL DDL: 10 tables, 3 views |
| `infrastructure/sql/migrations/` | Auth + tenancy migration scripts (001, 002) |
| `infrastructure/terraform/` | Azure IaC (Container Apps, PostgreSQL, Key Vault, ACR, App Insights) |
| `infrastructure/terraform/envs/` | Environment-specific configs (staging.tfvars, prod.tfvars) |
| `.github/workflows/ci.yml` | Multi-job CI: lint, typecheck, tests, build, security scan |
| `.github/workflows/deploy.yml` | CD: staging auto-deploy, production with approval gate |
| `frontend/src/lib/auth.ts` | NextAuth.js v5 config (Azure AD + hardened dev credentials) |
| `frontend/src/lib/session.ts` | `getAppSession()` / `requireSession()` helpers |
| `frontend/src/lib/stripe.ts` | Stripe client (lazy-init), checkout/portal helpers |
| `frontend/src/lib/plans.ts` | Plan definitions, feature gate functions |
| `frontend/src/lib/workflows.ts` | Agentic workflow engine (4 automated workflows) |
| `frontend/src/lib/telemetry.ts` | Application Insights (optional, Azure only) |
| `frontend/src/lib/queries.ts` | 12 org-scoped parameterized SQL query functions |
| `frontend/src/lib/db.ts` | node-postgres Pool singleton (env-driven config) |
| `frontend/src/lib/validation.ts` | Input validation: `validateInt`, `validateEnum`, `validateUUID` |
| `frontend/src/lib/rate-limit.ts` | In-memory rate limiter (60 req/min per IP) |
| `frontend/src/lib/crypto.ts` | Timing-safe comparison utility (`safeCompare`) |
| `frontend/src/lib/errors.ts` | Sanitized API error responses with `requestId` |
| `frontend/src/lib/fetcher.ts` | Shared SWR fetcher with `ApiError` and retry config |
| `frontend/src/lib/env.ts` | Startup env var validation (throws if critical vars missing) |
| `frontend/src/lib/types.ts` | TypeScript interfaces for all tables + auth + billing |
| `frontend/src/lib/constants.ts` | Sensor thresholds, colors, nav items |
| `frontend/src/middleware.ts` | Auth + rate limiting middleware for /dashboard/* and /api/* |
| `frontend/src/components/marketing/` | 8 landing page components (Hero, Stats, Features, etc.) |
| `frontend/src/components/billing/` | PlanBadge, UpgradePrompt |
| `frontend/src/components/layout/` | Sidebar, Header, UserMenu, ThemeProvider |
| `frontend/__tests__/` | 13 Jest test suites (78 tests) — lib + API routes |
| `tests/` | 5 pytest test suites (25 tests) — ETL pipeline |
| `SECURITY.md` | Security policy, auth model, vulnerability reporting |
| `CONTRIBUTING.md` | Branch strategy, PR flow, code standards |
| `docs/RUNBOOK.md` | Deployment, rollback, troubleshooting guide |

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compressor_health
DB_USER=postgres
DB_PASSWORD=postgres

# Authentication (NextAuth.js v5 + Azure AD)
AUTH_SECRET=                    # openssl rand -base64 32
AUTH_TRUST_HOST=true
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# Agentic Workflows (API key for cron/scheduler)
WORKFLOW_API_KEY=

# Azure Monitor (optional, for App Insights telemetry)
APPLICATIONINSIGHTS_CONNECTION_STRING=

# ETL Pipeline
ETL_ORGANIZATION_ID=           # Default org UUID for pipeline writes
DB_TYPE=postgresql             # or azure_sql
```

## Coding Patterns

### PySpark
- Load with explicit schema: `spark.read.schema(SENSOR_SCHEMA).parquet(path)`
- Single select for all transforms: `df.select(col("*"), avg("col").over(window).alias("new"))`
- Broadcast small tables: `large_df.join(broadcast(small_df), "compressor_id")`

### Database
- All queries org-scoped: `WHERE organization_id = $1` or via JOIN to org-filtered table
- Use views for common queries: `v_latest_readings`, `v_active_alerts`, `v_fleet_health_summary`
- Always parameterized queries (never string interpolation)

### Frontend (Next.js)
- Colors: `#1F77B4` (primary), `#2CA02C` (healthy), `#FF7F0E` (warning), `#D62728` (critical)
- Landing: dark palette `#0A0E17`, gradients `#1F77B4` → `#6C5CE7`, glass cards `bg-white/5 backdrop-blur-xl`
- Fonts: Inter (body/headings), JetBrains Mono (numbers/metrics)
- Route groups: `(marketing)` public, `(dashboard)` authenticated, `(auth)` login
- SWR hooks in `frontend/src/hooks/` — 30s refresh for fleet/alerts, 60s for readings
- Tailwind CSS v4 with `@theme inline` block in `globals.css`
- Dark mode via `.dark` class on `<html>`, toggled via ThemeProvider context
- Session: `useSession()` (client) or `getAppSession()` (server)
- Feature gates: `canAccessWindowType(tier, windowType)`, `canAccessFeature(tier, feature)`

## Simulated Failures

- **COMP-003**: Degradation starts Day 3, failure on Day 6
- **COMP-007**: Degradation starts Day 5, failure on Day ~8
- Patterns: vibration → exponential increase, temperature → linear increase, pressure → sinusoidal fluctuations
