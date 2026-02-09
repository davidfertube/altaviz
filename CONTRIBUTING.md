# Contributing to Altaviz

## Branch Strategy

```
main      ← production (protected, requires PR + approval)
staging   ← pre-production validation (protected, requires PR)
develop   ← active development (default branch for PRs)
```

### Branch Naming

- `feature/<description>` — New features
- `fix/<description>` — Bug fixes
- `chore/<description>` — Maintenance, dependencies, docs

### PR Flow

```
feature/my-feature → develop → staging → main
```

1. Create branch from `develop`
2. Open PR to `develop` — CI runs lint, typecheck, tests, build, security scan
3. After merge to `develop`, open PR to `staging` for pre-production validation
4. After staging validation, open PR to `main` for production deployment

## Development Setup

```bash
# Prerequisites: Python 3.10+, Java 11+, Node.js 18+, Docker

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install

# Database
docker-compose up -d

# Generate test data and run ETL
python src/data_simulator/compressor_simulator.py
python src/etl/pyspark_pipeline.py

# Launch dashboard
cd frontend && npm run dev
```

## Running Tests

```bash
# Frontend (Jest) — 13 test suites, 78 tests
cd frontend && npm test

# Frontend with coverage
cd frontend && npm run test:coverage

# Python ETL (pytest) — 5 test suites, 25 tests
JAVA_HOME=/path/to/java11 PYSPARK_PYTHON=.venv/bin/python PYTHONPATH=. \
  .venv/bin/python -m pytest tests/ -v

# Lint + typecheck
cd frontend && npx tsc --noEmit && npx eslint .
```

## Required PR Checks

All PRs must pass:

1. **Lint + typecheck** — `tsc --noEmit` + ESLint
2. **Frontend tests** — `npm test` (78 tests across 13 suites)
3. **Python tests** — `pytest tests/` (25 tests across 5 suites)
4. **Build** — `npm run build` must succeed
5. **Security scan** — `npm audit` + Trivy filesystem scan

## Database Migrations

Migrations live in `infrastructure/sql/migrations/` with numbered prefixes:

```
001_add_auth_and_tenancy.sql
002_add_org_id_to_remaining_tables.sql
```

To add a new migration:

1. Create `infrastructure/sql/migrations/NNN_description.sql`
2. Include `BEGIN`/`COMMIT` transaction wrapper
3. Add rollback comments for reversibility
4. Test locally: `docker exec -i altaviz-postgres psql -U postgres -d compressor_health < infrastructure/sql/migrations/NNN_description.sql`
5. Update CLAUDE.md if schema changes affect application queries

## Code Standards

### PySpark
- Always use explicit `StructType` schemas — never `inferSchema`
- Prefer single `.select()` over chained `.withColumn()`
- Use `broadcast()` for small dimension tables
- Sensor thresholds in `config/thresholds.yaml`, not hardcoded

### Frontend (TypeScript)
- All SQL queries parameterized (`$1`, `$2`)
- All queries org-scoped via `organization_id`
- Use shared `fetcher` from `lib/fetcher.ts` for SWR hooks
- Input validation via `lib/validation.ts` on all API route parameters
- Error handling via `lib/errors.ts` — never expose stack traces

### Security
- Never commit `.env` or credential files
- Use `safeCompare()` from `lib/crypto.ts` for secret comparison
- All API routes must check authentication via `getAppSession()`
- Rate limiting applied via middleware on all `/api/*` routes

## Agentic Workflow Development

Workflows in `lib/workflows.ts` are automated database operations triggered via `POST /api/workflows/run`. To add a new workflow:

1. Add the function to `lib/workflows.ts`
2. Register it in the `WORKFLOW_MAP` in `src/app/api/workflows/run/route.ts`
3. Add corresponding test in `__tests__/api/workflows.test.ts`
4. Externalize any configurable thresholds as environment variables
