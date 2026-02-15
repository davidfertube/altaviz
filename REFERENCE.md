# Altaviz: Build Guide from Scratch

A complete walkthrough for rebuilding this predictive maintenance SaaS platform from zero. Each section explains **what** was built, **why** it was built that way, and **how** to replicate it.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Database Layer — PostgreSQL Schema Design](#3-database-layer--postgresql-schema-design)
4. [Data Simulator — Generating Realistic Sensor Data](#4-data-simulator--generating-realistic-sensor-data)
5. [ETL Pipeline — PySpark Medallion Architecture](#5-etl-pipeline--pyspark-medallion-architecture)
6. [ML Models — Predictive Maintenance Intelligence](#6-ml-models--predictive-maintenance-intelligence)
7. [Frontend — Next.js Multi-Tenant Dashboard](#7-frontend--nextjs-multi-tenant-dashboard)
8. [Authentication — NextAuth.js v5 + OAuth](#8-authentication--nextauthjs-v5--oauth)
9. [Billing — Stripe Integration](#9-billing--stripe-integration)
10. [Agentic Workflows — Automated Alert Management](#10-agentic-workflows--automated-alert-management)
11. [Security Hardening](#11-security-hardening)
12. [Testing Strategy](#12-testing-strategy)
13. [CI/CD & Deployment](#13-cicd--deployment)
14. [Configuration Architecture](#14-configuration-architecture)
15. [Key Patterns & Lessons Learned](#15-key-patterns--lessons-learned)

---

## 1. Project Overview

**Altaviz** is a multi-tenant SaaS platform for predictive maintenance of natural gas compression equipment. It monitors 10 compressor units across 4 Texas stations, detecting failures 24-48 hours before they happen.

### Stack

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| Data Processing | PySpark 3.5 + Delta Lake 3.0 | Industry-standard for large-scale sensor data; Spark runs on Fabric/Databricks too |
| Database | PostgreSQL (Supabase free tier) | Free, reliable, excellent SQL support, row-level security capable |
| Frontend | Next.js 16 + React 19 + Tailwind CSS v4 | Server components for fast loads, App Router for layouts, shadcn/ui for polish |
| Auth | NextAuth.js v5 (GitHub + Google OAuth) | Free OAuth, JWT-based, middleware-protected routes |
| Billing | Stripe | Industry standard, generous free tier, webhook-driven |
| Hosting | Vercel (free) + Azure App Service (free) | Zero cost, global CDN, automatic HTTPS |
| CI/CD | GitHub Actions | Free for public repos, 2000 min/mo for private |

### Architecture Flow

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → ML Inference → PostgreSQL
                                                                       ↓
                                                                Next.js Dashboard
                                                                       ↓
                                                               Vercel (Free Tier)
```

### Monthly Cost: $0

---

## 2. Prerequisites & Environment Setup

### Required Software

```bash
# Python 3.10-3.13 (NOT 3.14 — PySpark 3.5 doesn't support it yet)
python3 --version

# Java 11+ (required for PySpark/Spark runtime)
java -version
# On macOS: brew install openjdk@11

# Node.js 18+ (for Next.js frontend)
node --version

# PostgreSQL client (for running schema migrations)
psql --version
```

### Project Setup

```bash
# Clone and enter project
git clone <repo-url> && cd altaviz

# Python virtual environment
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..

# Environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, AUTH_SECRET, OAuth credentials
```

### Environment Variables Explained

```bash
# DATABASE — the single most important var
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
# This is used by BOTH the frontend (pg npm) and ETL (JDBC driver)

# AUTH — generate a random secret, set trust host for non-localhost deploys
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true

# OAUTH — register apps at github.com/settings/developers and console.cloud.google.com
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# DEV ONLY — bypass OAuth for local development
DEV_CREDENTIALS_ENABLED=true
DEV_ALLOWED_EMAILS=admin@altaviz.com
```

### Running the Full Stack

```bash
# Terminal 1: Generate data + run ETL pipeline
JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home \
PYSPARK_PYTHON=.venv/bin/python \
PYSPARK_DRIVER_PYTHON=.venv/bin/python \
PYTHONPATH=. \
.venv/bin/python src/data_simulator/compressor_simulator.py

JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home \
PYSPARK_PYTHON=.venv/bin/python \
PYSPARK_DRIVER_PYTHON=.venv/bin/python \
PYTHONPATH=. \
.venv/bin/python src/etl/pyspark_pipeline.py

# Terminal 2: Launch frontend
cd frontend && npm run dev
# Open http://localhost:3000
```

---

## 3. Database Layer — PostgreSQL Schema Design

### Why PostgreSQL (Supabase)

- **Free tier**: 500MB storage, unlimited API calls, 2 projects
- **Native to Next.js**: `pg` (node-postgres) is the simplest driver — no ORM overhead
- **Parameterized queries**: `$1, $2` placeholders prevent SQL injection natively
- **Views**: Pre-built queries for common dashboard needs (fleet health, active alerts)

### Schema Design (11 Tables, 3 Views)

File: `infrastructure/sql/schema.sql`

The schema follows a **tenant-first** design. Every table has `organization_id` (NOT NULL) and every query filters by it.

```
organizations (tenant root)
├── users (org members, OAuth-linked)
├── billing_events (Stripe webhook log)
├── station_locations (4 Texas stations)
│   └── compressor_metadata (10 units)
│       ├── sensor_readings_agg (hourly aggregates from ETL)
│       ├── alert_history (generated by ETL + workflows)
│       ├── maintenance_events (from CSV logs)
│       ├── data_quality_metrics (pipeline health)
│       ├── ml_predictions (anomaly scores, RUL, temp drift)
│       └── emissions_estimates (EPA Subpart W)
```

### Foreign Key Chain — Write Order Matters

```
station_locations FIRST → compressor_metadata → everything else
```

If you try to write sensor data before the compressor metadata row exists, the FK constraint will reject it. The ETL pipeline handles this order automatically.

### Key Design Decisions

1. **Hourly aggregates, not raw readings**: Raw data stays in Delta Lake (local). The database stores 1hr/4hr/24hr aggregates — this gives 83% data reduction (10,080 raw → 1,690 aggregates).

2. **Views for common queries**: Instead of complex JOINs in application code:
   ```sql
   -- v_fleet_health_summary: one row per compressor with latest health status
   -- v_active_alerts: unresolved alerts with compressor metadata joined
   -- v_latest_readings: most recent aggregate per compressor
   ```

3. **Triggers for updated_at**: Never manually set `updated_at` — a trigger handles it:
   ```sql
   CREATE OR REPLACE FUNCTION update_modified_column()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
   $$ language 'plpgsql';
   ```

4. **Idempotent upserts**: Use `ON CONFLICT DO UPDATE` so the ETL pipeline can be re-run safely without duplicating data.

### Setting Up the Database

```bash
# Option A: Supabase (cloud, free)
# 1. Create project at supabase.com
# 2. Go to Settings → Database → Connection string
# 3. Run schema:
psql "$DATABASE_URL" < infrastructure/sql/schema.sql

# Option B: Local Docker (development)
docker-compose up -d postgres
# Schema auto-applied via docker-entrypoint-initdb.d
```

---

## 4. Data Simulator — Generating Realistic Sensor Data

File: `src/data_simulator/compressor_simulator.py`

### What It Does

Generates 10 days of sensor readings at 10-minute intervals for 10 compressors (50,400+ readings). Two compressors are programmed to degrade and fail.

### Simulated Sensor Channels

| Sensor | Unit | Normal Range | What It Indicates |
|--------|------|-------------|-------------------|
| Vibration | mm/s | 1.5–4.5 | Bearing wear, misalignment |
| Discharge Temp | F | 180–220 | Compression efficiency, cooling health |
| Suction Pressure | PSI | 40–80 | Upstream gas supply |
| Discharge Pressure | PSI | 900–1200 | Downstream delivery |
| Horsepower | HP | 1200–1600 | Compressor load |
| Gas Flow | Mcf/day | 8000–12000 | Throughput |

### Failure Simulation

```
COMP-003: Degradation starts Day 3, full failure Day 6
  - Vibration: exponential increase (bearing failure pattern)
  - Temperature: linear increase (cooling system degradation)

COMP-007: Degradation starts Day 5, failure Day ~8
  - Similar pattern, different timing (proves ML generalization)
```

### Why This Design

Real-world sensor data is expensive and proprietary. The simulator creates data that:
- Has realistic statistical distributions (Gaussian noise, diurnal patterns)
- Includes known failure modes (so ML model accuracy is verifiable)
- Is fully reproducible (`np.random.seed(42)`)

```bash
python src/data_simulator/compressor_simulator.py
# Output: data/raw/sensor_readings.parquet, compressor_metadata.csv, maintenance_logs.csv
```

---

## 5. ETL Pipeline — PySpark Medallion Architecture

File: `src/etl/pyspark_pipeline.py`

### The Medallion Pattern

This is the industry-standard data engineering pattern used at Databricks, Microsoft Fabric, and most modern data platforms.

```
BRONZE (Raw)          SILVER (Clean)         GOLD (Business-Ready)
─────────────         ──────────────         ────────────────────
Raw Parquet as-is     Nulls removed          Rolling aggregates
+ load timestamp      Outliers flagged       Rate-of-change features
Append-only           Deduplication          Threshold status flags
IMMUTABLE             Validated types        Time features (hour, day)
                                             Partitioned by date
```

### Why Each Layer Matters

**Bronze**: Raw data preservation. If cleaning logic changes, you can always replay from Bronze. This is why it's append-only and immutable.

**Silver**: Data quality. In production, sensors produce nulls, duplicate readings, and outliers. Silver applies:
- Null removal on critical columns (compressor_id, timestamp)
- Statistical outlier detection (4 standard deviations)
- Deduplication by (compressor_id, timestamp)

**Gold**: Feature engineering for ML and dashboards. This is where raw sensor values become actionable intelligence:
- Rolling averages (1hr, 4hr, 24hr windows)
- Rate-of-change (how fast is temperature climbing?)
- Threshold flags (normal/warning/critical per sensor)

### Critical PySpark Patterns

```python
# ALWAYS use explicit schemas — never inferSchema
df = spark.read.schema(SENSOR_SCHEMA).parquet(path)

# SINGLE .select() for all new columns — Catalyst optimizer works best this way
gold_df = silver_df.select(
    col("*"),
    avg("vibration_mms").over(window_1hr).alias("vibration_1hr_mean"),
    avg("discharge_temp_f").over(window_1hr).alias("temp_1hr_mean"),
    # ... all features in one pass
)

# broadcast() small tables for efficient joins
enriched = large_df.join(broadcast(metadata_df), "compressor_id")
```

### Pipeline Output

```
10,080 raw readings
  → Silver: ~10,000 (nulls/outliers removed)
  → Gold: ~10,000 (features added)
  → Database: 1,690 hourly aggregates (83% reduction)
  → 419 alerts generated (threshold violations)
  → ML predictions per compressor
  → Emissions estimates per compressor
  → Data quality metrics per compressor

Total runtime: ~21 seconds
```

---

## 6. ML Models — Predictive Maintenance Intelligence

All models live in `src/ml/` and run as Stage 4 of the pipeline (after Gold, before Database).

### Model 1: Anomaly Detection (Isolation Forest)

File: `src/ml/anomaly_detector.py`

**Algorithm**: scikit-learn Isolation Forest — an unsupervised algorithm that learns what "normal" looks like, then scores new data on how anomalous it is.

**Why Isolation Forest**: It works without labeled failure data (unsupervised), handles high-dimensional sensor data, and is fast enough for batch inference on 10K+ rows.

**Input features**: vibration_mean, vibration_std, vibration_max, discharge_temp_mean, temp_rate_of_change, pressure_delta_mean, horsepower_mean

**Output**: anomaly_score (-1 to 1), is_anomaly (boolean)

**Training**: Trained on data from healthy compressors only (COMP-001, 002, 004-006, 008-010). When COMP-003/007 readings are scored, the degradation patterns register as anomalies.

### Model 2: Temperature Drift Prediction

File: `src/ml/temp_drift_predictor.py`

**Algorithm**: Linear regression (scipy) on temperature trends. Extrapolates current temperature trajectory to predict when warning/critical thresholds will be hit.

**Output**: hours_to_warning, hours_to_critical

### Model 3: Emissions Estimation (EPA Subpart W)

File: `src/ml/emissions_estimator.py`

**Algorithm**: EPA Subpart W emission factors (not ML — regulatory compliance calculation). Estimates CH4 and CO2e emissions based on gas flow, pressure, and operating hours.

**Why include it**: Energy sector companies must report emissions. Having this in the dashboard shows regulatory awareness.

### Model 4: RUL Prediction (Remaining Useful Life)

File: `src/ml/rul_predictor.py`

**Algorithm**: Heuristic rule-based scoring. Each sensor's proximity to its critical threshold contributes to a combined health score, which maps to estimated remaining hours.

**Key lesson**: Thresholds are loaded from `config/thresholds.yaml`, not hardcoded. This follows the config-driven architecture principle.

---

## 7. Frontend — Next.js Multi-Tenant Dashboard

### Project Structure

```
frontend/src/
├── app/
│   ├── (marketing)/         # Public pages: landing, pricing
│   ├── (auth)/login/        # Authentication page
│   ├── (dashboard)/         # Protected routes (require auth)
│   │   └── dashboard/
│   │       ├── page.tsx           # Fleet Overview
│   │       ├── monitoring/        # Compressor grid + detail
│   │       ├── alerts/            # Alert management
│   │       ├── data-quality/      # Pipeline health
│   │       └── settings/          # Org settings + billing
│   ├── (demo)/              # Public demo (no auth needed)
│   │   └── demo/                  # Same pages as dashboard, static data
│   └── api/                 # API routes (server-side)
│       ├── fleet/           # Fleet health endpoint
│       ├── compressors/     # Compressor detail endpoint
│       ├── alerts/          # Alert CRUD
│       ├── demo/            # Demo data endpoints
│       ├── stripe/          # Billing webhooks
│       └── workflows/       # Agentic workflow trigger
├── components/
│   ├── ui/                  # 21 shadcn/ui base components
│   └── marketing/           # Landing page components
├── hooks/                   # SWR data fetching hooks
└── lib/
    ├── db.ts                # PostgreSQL pool (pg)
    ├── queries.ts           # 12 org-scoped SQL query functions
    ├── auth.ts              # NextAuth configuration
    ├── workflows.ts         # 4 agentic workflows
    ├── stripe.ts            # Stripe client
    ├── demo-data.ts         # Pre-seeded demo data
    ├── audit.ts             # Audit logging helper
    └── rate-limit.ts        # In-memory rate limiter
```

### Route Groups (Next.js App Router)

Route groups organize pages by access level without affecting URLs:

- `(marketing)` — Public: `/`, `/pricing`
- `(auth)` — Public: `/login`
- `(demo)` — Public: `/demo/*` (full dashboard experience, no auth)
- `(dashboard)` — Protected: `/dashboard/*` (requires session)

### Data Fetching Pattern

SWR hooks provide real-time data with automatic revalidation:

```typescript
// hooks/useFleetHealth.ts
const { data, error, isLoading } = useSWR(
  '/api/fleet',
  fetcher,
  { refreshInterval: 30000 }  // Re-fetch every 30 seconds
);
```

### Database Query Pattern

Every query is org-scoped and parameterized:

```typescript
// lib/queries.ts
export function getFleetHealth(organizationId: string) {
  return query<FleetHealthSummary>(
    'SELECT * FROM v_fleet_health_summary WHERE organization_id = $1',
    [organizationId]
  );
}
```

### Design System

- Colors: `#1F77B4` (primary blue), `#2CA02C` (healthy green), `#FF7F0E` (warning orange), `#D62728` (critical red)
- Dark mode: `.dark` class on `<html>`, toggled via ThemeProvider
- Components: shadcn/ui (Radix primitives + Tailwind), framer-motion for animations
- Charts: Recharts for time-series, react-leaflet for station maps, radial gauges for compressor health

### Demo Mode — Why It Exists

The `/demo/*` routes let anyone experience the full dashboard without creating an account or connecting a database. This is critical for:
- Portfolio reviews (recruiters/hiring managers can click through immediately)
- Sales demos (prospects see the product without onboarding)
- Development (frontend work doesn't require ETL pipeline)

Demo data lives in `frontend/src/lib/demo-data.ts` — 10 compressors, 4 stations, realistic alerts and readings.

---

## 8. Authentication — NextAuth.js v5 + OAuth

File: `frontend/src/lib/auth.ts`

### Flow

1. User clicks "Sign in with GitHub" (or Google)
2. Redirected to OAuth provider, grants access
3. Callback creates/finds user + organization via `findOrCreateUser()`
4. JWT token minted with: `userId`, `organizationId`, `role`, `subscriptionTier`
5. Middleware checks JWT on all `/dashboard/*` routes
6. Every API call extracts `organizationId` from session for data scoping

### Multi-Tenancy via JWT

```typescript
// JWT enriched during sign-in callback
token.organizationId = user.organizationId;
token.organizationName = user.organizationName;
token.role = user.role;              // owner | admin | operator | viewer
token.subscriptionTier = user.tier;  // free | pro | enterprise
```

### Dev Credentials

For local development without OAuth setup:

```typescript
// Only active when DEV_CREDENTIALS_ENABLED=true
// Only allows emails in DEV_ALLOWED_EMAILS
// NEVER works in production (env.ts validates this)
CredentialsProvider({
  authorize: async (credentials) => {
    // Validates email against allowlist
  }
})
```

---

## 9. Billing — Stripe Integration

File: `frontend/src/lib/stripe.ts`

### Tier Model

| Tier | Price | Compressors | Data Windows | ML Features |
|------|-------|-------------|-------------|-------------|
| Free | $0 | 2 | 1hr only | No |
| Pro | $49/mo | 20 | All (1hr, 4hr, 24hr) | No |
| Enterprise | $199/mo | Unlimited | All | Anomaly + RUL |

### How It Works

1. User clicks "Upgrade" → `POST /api/stripe/checkout` creates a Stripe Checkout session
2. User completes payment on Stripe-hosted page
3. Stripe sends webhook to `POST /api/stripe/webhooks`
4. Webhook handler updates `organizations.subscription_tier` and logs to `billing_events`
5. Dashboard UI reads tier from session JWT

### Lazy Initialization

```typescript
// Stripe client only created when STRIPE_SECRET_KEY is set
// The app runs fine without Stripe — billing features just won't appear
let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
```

---

## 10. Agentic Workflows — Automated Alert Management

File: `frontend/src/lib/workflows.ts`

Four SQL-driven workflows that automate alert lifecycle management:

| Workflow | What It Does | SQL Pattern |
|----------|-------------|-------------|
| `alert_escalation` | Warnings unacknowledged for 4h → auto-escalate to critical | `UPDATE ... WHERE severity='warning' AND acknowledged=FALSE AND alert_timestamp < NOW() - interval` |
| `alert_auto_resolve` | Resolve alerts when latest readings return to healthy range | `UPDATE ... SET resolved=TRUE` after joining with latest healthy readings |
| `data_freshness_check` | Create staleness alerts if no data received for 3h+ | `INSERT INTO alert_history` for stale compressors |
| `stale_alert_cleanup` | Auto-acknowledge alerts unactioned for 7+ days | `UPDATE ... SET acknowledged=TRUE` |

### Trigger Methods

```bash
# Via API (session auth — admin/owner only)
curl -X POST http://localhost:3000/api/workflows/run?workflow=all

# Via cron (API key auth — for GitHub Actions scheduled jobs)
curl -X POST http://localhost:3000/api/workflows/run \
  -H "x-api-key: $WORKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "uuid-here"}'
```

### API Key Rotation

The workflow route supports both `WORKFLOW_API_KEY` and `WORKFLOW_API_KEY_OLD` for zero-downtime key rotation:
1. Generate new key, set as `WORKFLOW_API_KEY`
2. Move old key to `WORKFLOW_API_KEY_OLD`
3. Update all cron jobs to use new key
4. Remove `WORKFLOW_API_KEY_OLD` after grace period

---

## 11. Security Hardening

### OWASP Top 10 Coverage

| Vulnerability | Mitigation | File |
|--------------|-----------|------|
| SQL Injection | Parameterized queries (`$1, $2`) everywhere | `lib/queries.ts`, `lib/workflows.ts` |
| Broken Auth | JWT with httpOnly secure cookies, OAuth providers | `lib/auth.config.ts` |
| Sensitive Data Exposure | SSL enforced (`rejectUnauthorized: true`), no credentials in code | `lib/db.ts` |
| XSS | CSP headers, React auto-escaping | `next.config.ts` |
| CSRF | SameSite cookies, Origin validation | `middleware.ts`, `auth.config.ts` |
| Rate Limiting | 60 req/min general, 10 req/min auth endpoints | `middleware.ts`, `lib/rate-limit.ts` |
| Input Validation | Regex validation on IDs, UUID format checks | `api/compressors/[compressorId]/route.ts` |

### Database Connection Security

```typescript
// lib/db.ts — SSL enforced by default
ssl: process.env.DATABASE_SSL === 'false'
  ? false                           // Only for local Docker (no SSL)
  : { rejectUnauthorized: true },   // Production: verify server cert
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline';          // Required by Next.js hydration
style-src 'self' 'unsafe-inline';           // Required by Tailwind
img-src 'self' data: blob: https:;
connect-src 'self' https://api.stripe.com;  // Stripe billing
```

### Audit Logging

```typescript
// lib/audit.ts — records who did what for compliance
await logAuditEvent({
  userId, organizationId,
  action: 'alert.acknowledge',
  resourceType: 'alert',
  resourceId: alertId,
  ipAddress: request.headers.get('x-forwarded-for'),
});
```

---

## 12. Testing Strategy

### 103 Tests Across 18 Suites

```bash
# Frontend (Jest) — 79 tests, 13 suites
cd frontend && npm test

# ETL (pytest) — 25 tests, 5 suites
pytest tests/ -v
```

### What's Tested

**Frontend**: API route handlers (fleet, alerts, compressors, stripe, health, workflows), library modules (db pool config, crypto, session, validation, subscription plans)

**ETL**: Schema validation, data quality transforms, pipeline stage outputs, database writer functions

### Testing Pattern

```typescript
// Mock external dependencies, test business logic
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    on: jest.fn(),
    end: jest.fn(),
  })),
}));

// Test org-scoping
it('returns 401 without session', async () => {
  mockGetAppSession.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
});
```

---

## 13. CI/CD & Deployment

### GitHub Actions Pipeline

File: `.github/workflows/ci.yml`

```
Push/PR → Lint + Type Check → Unit Tests → Build → Security Audit
```

Quality gates — all must pass (no `|| true` bypasses):
- `npx tsc --noEmit` — TypeScript compilation
- `npm test` — All Jest tests
- `pytest tests/ -v` — All ETL tests
- `npm audit --audit-level=high` — No high/critical vulnerabilities
- `npm run build` — Production build succeeds

### Deployment

**Vercel** (primary, $0): Auto-deploys on push to `main`. Zero config — just connect the GitHub repo.

**Azure App Service** (secondary, $0): Free F1 tier via Terraform. Docker container deployed through GitHub Actions.

```bash
# Local Docker
docker-compose up -d
# Starts PostgreSQL + frontend at http://localhost:3000
```

---

## 14. Configuration Architecture

All configuration lives in YAML files — never hardcoded in application code.

### config/thresholds.yaml

Defines sensor operating ranges and alert thresholds based on industry standards (API 618, ISO 10816). Contains:
- Normal/warning/critical ranges for each sensor type
- Station locations (GPS coordinates for 4 Texas stations)
- Compressor model specs (Ajax, Ariel, Caterpillar, Waukesha)
- Alert rules (escalation timing, aggregation windows, auto-resolve conditions)

### config/etl_config.yaml

Controls pipeline behavior:
- Data paths (Bronze/Silver/Gold directories)
- Window sizes for rolling aggregates (1hr, 4hr, 24hr)
- Data quality thresholds (5% max missing rate, 4 std dev outlier cutoff)
- Spark configuration (memory, packages, Delta Lake settings)

### config/database.yaml

Database connection settings for the PySpark JDBC writer.

### Why YAML Over Environment Variables

Environment variables are for secrets and deployment-specific settings (DATABASE_URL, API keys). Configuration that changes per-domain (sensor thresholds, window sizes, alert rules) belongs in version-controlled YAML files so changes are reviewable and auditable.

---

## 15. Key Patterns & Lessons Learned

### PySpark Gotchas

1. **`date_format()` returns StringType** — You must `.cast("timestamp")` before writing to a TIMESTAMP column via JDBC.

2. **Never use `inferSchema`** — It reads the entire dataset to guess types. Always define `StructType` schemas explicitly in `src/etl/schemas.py`.

3. **Single `.select()` over chained `.withColumn()`** — Catalyst optimizer generates better query plans with one expression tree.

4. **`broadcast()` small tables** — Station locations and compressor metadata are tiny (10 rows). Broadcasting avoids expensive shuffle joins.

### Frontend Patterns

1. **Org-scoping is non-negotiable** — Every SQL query, every API route, every data fetch filters by `organization_id`. There is no way to access another tenant's data.

2. **SWR for real-time feel** — `useSWR` with 30-second refresh intervals makes the dashboard feel live without WebSockets complexity.

3. **Demo mode as a feature** — The `/demo/*` routes are the single best thing for portfolio projects. Reviewers can experience the full product in 10 seconds without signup.

4. **Lazy initialization everywhere** — Stripe client, DB pool, auth providers all initialize on first use. The app starts without requiring every integration to be configured.

### Security Lessons

1. **SSL: `rejectUnauthorized: true`** — Never set this to `false` in production. It disables certificate verification, making the connection vulnerable to MITM attacks.

2. **Parameterized queries prevent SQL injection** — Use `$1, $2` placeholders, never string interpolation. Even for dynamic batch operations.

3. **Rate limiting is table stakes** — 60 req/min per IP for general API, 10 req/min for auth endpoints. Without this, a single script can DoS your app.

### Architecture Lessons

1. **Medallion pattern is worth the complexity** — Bronze/Silver/Gold feels over-engineered at first, but the ability to re-process from Bronze when logic changes saves enormous time.

2. **Config-driven thresholds** — When a domain expert says "change the vibration warning from 6.0 to 5.5", you change one YAML value, not grep through application code.

3. **Write order matters with FK constraints** — The ETL pipeline must write `station_locations` before `compressor_metadata` before `sensor_readings_agg`. Violation = FK constraint error.

4. **Multi-tenancy from Day 1** — Adding `organization_id` after the fact is a nightmare migration. Design it in from the start, even for a single-tenant MVP.

---

## Quick Reference: File Map

| File | Purpose |
|------|---------|
| `src/data_simulator/compressor_simulator.py` | Generates synthetic sensor data |
| `src/etl/pyspark_pipeline.py` | 5-stage ETL orchestrator |
| `src/etl/schemas.py` | PySpark StructType schemas |
| `src/etl/data_quality.py` | Silver layer cleaning logic |
| `src/etl/transformations.py` | Gold layer feature engineering |
| `src/etl/database_writer.py` | PostgreSQL JDBC writer |
| `src/ml/anomaly_detector.py` | Isolation Forest anomaly detection |
| `src/ml/temp_drift_predictor.py` | Temperature drift prediction |
| `src/ml/emissions_estimator.py` | EPA Subpart W emissions |
| `src/ml/rul_predictor.py` | Remaining Useful Life estimation |
| `config/thresholds.yaml` | Sensor ranges, stations, alert rules |
| `config/etl_config.yaml` | Pipeline configuration |
| `config/database.yaml` | Database connection settings |
| `infrastructure/sql/schema.sql` | PostgreSQL DDL (11 tables, 3 views) |
| `frontend/src/lib/db.ts` | PostgreSQL connection pool |
| `frontend/src/lib/queries.ts` | 12 org-scoped SQL queries |
| `frontend/src/lib/auth.ts` | Authentication (NextAuth.js v5) |
| `frontend/src/lib/workflows.ts` | 4 agentic workflows |
| `frontend/src/lib/stripe.ts` | Stripe billing client |
| `frontend/src/lib/demo-data.ts` | Pre-seeded demo data |
| `frontend/src/lib/audit.ts` | Audit logging helper |
| `frontend/src/lib/rate-limit.ts` | In-memory rate limiter |
| `.env.example` | All environment variables |
| `docker-compose.yml` | Local dev with PostgreSQL |
| `.github/workflows/ci.yml` | CI/CD pipeline |

---

*Built by David Fernandez — Altaviz Predictive Maintenance Platform*
