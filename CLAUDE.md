# Altaviz

Multi-tenant SaaS platform for pipeline integrity management across oil and gas infrastructure.
Stack: PySpark 3.5 + Delta Lake 3.0 | PostgreSQL (Supabase) | Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui | NextAuth.js v5 (GitHub + Google OAuth) | Stripe Billing | Vercel (primary) + Azure App Service (secondary)
Status: Portfolio-ready MVP — ETL pipeline with ML inference, multi-tenant dashboard, live demo mode, auth, billing, agentic workflows, RBAC, team management, email notifications, comprehensive test suite (263 tests), and CI/CD pipeline. Monthly cost: $0.

## Critical Rules

- NEVER use `inferSchema`; always use explicit `StructType` schemas from `src/etl/schemas.py`
- NEVER chain `.withColumn()` calls; use a single `.select()` with all new columns
- NEVER hardcode database credentials; use `DATABASE_URL` environment variable
- NEVER commit `.env` files, `.env.local`, or `data/` directory contents
- Maintain Bronze → Silver → Gold → ML medallion pattern; Bronze is immutable raw data
- Use `broadcast()` for joins with small tables (metadata, stations = 10 rows)
- Partition Gold layer by `date` column
- All sensor thresholds live in `config/thresholds.yaml`, not in application code
- Frontend: all SQL queries must be parameterized (never string interpolation)
- Frontend: all queries must be org-scoped via `organization_id` parameter
- Frontend: use SWR hooks for data fetching with appropriate refresh intervals
- Prerequisites: Python 3.10+, Java 11+ (for PySpark), Node.js 18+

## Key Commands

```bash
python src/data_simulator/compressor_simulator.py        # Generate 50k+ sensor readings
python src/etl/pyspark_pipeline.py                       # Run complete ETL + ML pipeline
python src/etl/pyspark_pipeline.py --skip-ml             # Run ETL without ML inference
python src/etl/pyspark_pipeline.py --skip-db             # Run ETL without database export
cd frontend && npm run dev                               # Launch frontend (dev mode, localhost:3000)
cd frontend && npm run build                             # Build frontend for production
cd frontend && npm test                                  # Run Jest tests (234 tests, 30 suites)
pytest tests/ -v                                         # Run pytest ML+ETL tests (29 tests, 9 suites)
cd frontend && npx tsc --noEmit                          # TypeScript type check
```

## Architecture

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → ML Inference → PostgreSQL (Supabase)
                                                          ↓                    ↓
                                    Anomaly Detection (Isolation Forest)  Next.js Dashboard
                                    Temperature Drift Prediction              ↓
                                    Emissions Estimation (EPA)           Vercel (Free Tier)
                                    RUL Prediction (Heuristic)
                                                                              ↓
Landing (/) ← Next.js 16 → Dashboard (/dashboard/*) → API Routes → PostgreSQL (org-scoped)
                ↓                        ↓
         Demo (/demo/*)     Auth (NextAuth v5 + GitHub/Google) + Stripe Billing
         (no auth required)
```

- Raw Parquet/CSV in `data/raw/`
- Delta Lake tables in `data/processed/delta/{sensors_bronze,sensors_silver,sensors_gold}/`
- Database stores hourly aggregates (1hr, 4hr, 24hr windows) in `sensor_readings_agg` table
- PostgreSQL (Supabase free tier) with `pg` (node-postgres) on frontend, JDBC on ETL
- 12 tables + 3 org-aware views (schema at `infrastructure/sql/schema.sql`)
- Multi-tenant: all data access filtered by `organization_id`

## Route Structure

```
/ .......................... Landing page (energy sector themed, animated counters, gradient CTAs)
/pricing ................... Pricing comparison (Free / Pro $49 / Enterprise $199)
/login ..................... Auth page (GitHub + Google OAuth + dev credentials)
/demo ...................... Live Demo — Fleet Overview (no auth, simulated data)
/demo/monitoring ........... Demo — Monitoring Grid
/demo/monitoring/[id] ...... Demo — Compressor Detail (gauges, trends, ML predictions)
/demo/alerts ............... Demo — Alert Management
/demo/emissions ............ Demo — EPA Emissions Monitoring
/dashboard ................. Fleet Overview (protected, requires auth)
/dashboard/monitoring ...... Monitoring Grid
/dashboard/monitoring/[id] . Compressor Detail (radial gauges, time-series charts)
/dashboard/alerts .......... Alert Management (filterable, acknowledge/resolve)
/dashboard/data-quality .... Pipeline Health metrics
/dashboard/settings ........ Organization, profile, team, billing
/dashboard/settings/billing  Subscription management (Stripe checkout/portal)
/dashboard/settings/team ... Team management (members, invites, roles)
/about ..................... Company story, mission, values
/contact ................... Contact form + sales info
/changelog ................. Product updates timeline
/privacy ................... Privacy policy
/terms ..................... Terms of service
/security .................. Security policy + compliance
```

Route groups: `(marketing)` public, `(dashboard)` authenticated, `(demo)` public demo, `(auth)` login.

## ML Models

| Model | File | Algorithm | Purpose |
|-------|------|-----------|---------|
| Anomaly Detection | `src/ml/anomaly_detector.py` | Isolation Forest (scikit-learn) | Detects unusual vibration patterns, 24-48hr early warning |
| Temperature Drift | `src/ml/temp_drift_predictor.py` | Linear Regression (scipy) | Predicts hours until temp warning/critical thresholds |
| Emissions Estimation | `src/ml/emissions_estimator.py` | EPA Subpart W factors | Estimates CH4/CO2e emissions for compliance tracking |
| RUL Prediction | `src/ml/rul_predictor.py` | Heuristic (rule-based) | Remaining Useful Life estimation from sensor degradation |

ML models run as a pipeline stage after Gold layer: `Bronze → Silver → Gold → ML → Database`

## Authentication & Multi-Tenancy

- **NextAuth.js v5** with GitHub + Google OAuth + dev Credentials provider
- JWT strategy enriched with `organizationId`, `organizationName`, `role`, `subscriptionTier`
- Dev credentials: requires `DEV_CREDENTIALS_ENABLED=true` + email allowlist
- Rate limiting: 60 req/min per IP on all `/api/*` routes via middleware
- Middleware protects all `/dashboard/*` routes → redirects to `/login`
- Demo routes (`/demo/*`) are public — no auth required
- Auto-creates org + user on first sign-in (`findOrCreateUser` in `lib/auth.ts`)
- All 12 query functions in `queries.ts` require `organizationId` parameter

## Stripe Billing

- Lazy-initialized client in `lib/stripe.ts` (won't crash if STRIPE_SECRET_KEY unset)
- Tiers: Free (2 compressors, 1hr window), Pro (20, all windows), Enterprise (unlimited + ML)
- Webhook handler: `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`
- `billing_events` table logs all Stripe events with idempotency (ON CONFLICT DO NOTHING)

## Agentic Workflows

Automated workflows in `lib/workflows.ts`, triggered via `POST /api/workflows/run`:

| Workflow | Action | Trigger |
|----------|--------|---------|
| `alert_escalation` | Unacknowledged warnings → critical after 4h | Cron / manual |
| `alert_auto_resolve` | Resolve alerts when sensor readings return to healthy | Cron / manual |
| `data_freshness_check` | Create staleness alerts if no data for 3h+ | Cron / manual |
| `stale_alert_cleanup` | Auto-acknowledge alerts unactioned for 7+ days | Cron / manual |

## Live Demo Mode

- `/demo/*` routes provide full dashboard experience without auth
- Pre-seeded data in `frontend/src/lib/demo-data.ts` (10 compressors, 4 Texas stations)
- Demo API routes at `/api/demo/*` return static data (no database required)
- COMP-003 shows active degradation (critical alerts, ML failure prediction)
- COMP-007 shows early warning patterns
- Emissions page shows EPA Subpart W compliance monitoring
- Demo banner at top: "This is a live demo with simulated data"

## Environment Variables

```bash
# Database (PostgreSQL via Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Authentication (NextAuth.js v5)
AUTH_SECRET=                    # openssl rand -base64 32
AUTH_TRUST_HOST=true
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# GOOGLE_CLIENT_ID=            # Optional
# GOOGLE_CLIENT_SECRET=        # Optional

# Dev credentials (local development only)
DEV_CREDENTIALS_ENABLED=true
DEV_ALLOWED_EMAILS=admin@altaviz.com

# Stripe Billing (optional)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# ETL Pipeline
# ETL_ORGANIZATION_ID=         # Default org UUID for pipeline writes
```

## Coding Patterns

### PySpark
- Load with explicit schema: `spark.read.schema(SENSOR_SCHEMA).parquet(path)`
- Single select for all transforms: `df.select(col("*"), avg("col").over(window).alias("new"))`
- Broadcast small tables: `large_df.join(broadcast(small_df), "compressor_id")`
- NEVER use doubled backslashes `\\` in code (PySpark SyntaxError bug)
- `date_format()` returns StringType: must `.cast("timestamp")` before JDBC write

### Database (PostgreSQL)
- All queries org-scoped: `WHERE organization_id = $1` or via JOIN to org-filtered table
- Use views for common queries: `v_latest_readings`, `v_active_alerts`, `v_fleet_health_summary`
- Always parameterized queries with `$1, $2` placeholders (native PostgreSQL)
- Use `INSERT ... ON CONFLICT ... DO UPDATE` for upserts
- Use `RETURNING *` for returning modified rows
- Triggers handle `updated_at` timestamps

### Frontend (Next.js)
- Colors: `#1F77B4` (primary), `#2CA02C` (healthy), `#FF7F0E` (warning), `#D62728` (critical)
- Landing: dark palette `#0A0E17`, gradients `#1F77B4` → `#6C5CE7`, glass cards `bg-white/5 backdrop-blur-xl`
- Fonts: Inter (body/headings), JetBrains Mono (numbers/metrics)
- Route groups: `(marketing)` public, `(dashboard)` authenticated, `(demo)` public demo, `(auth)` login
- SWR hooks in `frontend/src/hooks/` — 30s refresh for fleet/alerts, 60s for readings
- shadcn/ui: 21 components in `frontend/src/components/ui/`
- Tailwind CSS v4 with `@theme inline` block in `globals.css`
- Dark mode via `.dark` class on `<html>`, toggled via ThemeProvider context

## Simulated Failures

- **COMP-003**: Degradation starts Day 3, failure on Day 6
- **COMP-007**: Degradation starts Day 5, failure on Day ~8
- Patterns: vibration → exponential increase, temperature → linear increase, pressure → sinusoidal fluctuations

## File Reference

| File | Purpose |
|------|---------|
| `config/database.yaml` | DB connection settings for PostgreSQL |
| `config/etl_config.yaml` | Window sizes, Spark config, data paths |
| `config/thresholds.yaml` | Sensor normal/warning/critical ranges, station locations |
| `.env.example` | All env vars: DB, Auth, Stripe, ETL |
| `infrastructure/sql/schema.sql` | PostgreSQL DDL: 12 tables, 3 views, triggers, seed data |
| `frontend/src/lib/db.ts` | PostgreSQL pool via `pg` (node-postgres) |
| `frontend/src/lib/queries.ts` | 12 org-scoped parameterized SQL query functions |
| `frontend/src/lib/auth.ts` | NextAuth.js v5 (GitHub + Google OAuth + dev credentials) |
| `frontend/src/lib/demo-data.ts` | Pre-seeded demo data (fleet, alerts, readings, emissions) |
| `frontend/src/lib/workflows.ts` | Agentic workflow engine (4 automated workflows) |
| `frontend/src/lib/stripe.ts` | Stripe client (lazy-init), checkout/portal helpers |
| `src/ml/anomaly_detector.py` | Isolation Forest anomaly detection on vibration data |
| `src/ml/temp_drift_predictor.py` | Temperature drift linear regression predictor |
| `src/ml/emissions_estimator.py` | EPA Subpart W emissions estimation |
| `src/ml/rul_predictor.py` | Heuristic Remaining Useful Life calculator |
| `src/etl/pyspark_pipeline.py` | 5-stage ETL: Bronze → Silver → Gold → ML → Database |
| `src/etl/database_writer.py` | PostgreSQL JDBC writer for all tables |
| `src/etl/schemas.py` | PySpark StructType schemas (sensor, bronze, silver, gold, emissions) |
| `frontend/src/lib/session.ts` | `getAppSession()`, `requireRole()`, RBAC helpers |
| `frontend/src/lib/email.ts` | Transactional email via Resend API (welcome, alerts, invites) |
| `frontend/src/lib/email-templates.ts` | HTML email templates with inline CSS |
| `frontend/src/lib/audit.ts` | Audit logging helper for enterprise compliance |
| `frontend/src/lib/rate-limit.ts` | In-memory rate limiter with header support |
