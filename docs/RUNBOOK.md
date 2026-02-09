# Altaviz Operations Runbook

## Deployment Checklist

### Pre-Deploy

1. All CI checks passing (lint, typecheck, tests, build, security scan)
2. Migration scripts tested on staging database
3. Environment variables configured in target environment
4. `AUTH_SECRET` is set (not the default) — verify with `echo $AUTH_SECRET | wc -c` (should be 44+ chars)

### Deploy

```bash
# Staging (auto-deploy on push to staging branch)
git push origin staging

# Production (requires GitHub Environment approval)
git push origin main
# Approve in GitHub Actions → Environments → production
```

### Post-Deploy Verification

```bash
# Health check
curl -f https://<app-url>/api/health
# Expected: {"status":"healthy","checks":{"database":"ok"},...}

# Auth check (should return 401)
curl -s -o /dev/null -w "%{http_code}" https://<app-url>/api/fleet
# Expected: 401

# Rate limit check
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" https://<app-url>/api/health
done
# Should see 429 after 60 requests
```

## Rollback Procedure

### Application Rollback

```bash
# Find previous working image
az acr repository show-tags --name <acr-name> --repository altaviz --orderby time_desc --top 5

# Update Container App to previous image
az containerapp update \
  --name altaviz-app \
  --resource-group altaviz-rg \
  --image <acr-name>.azurecr.io/altaviz:<previous-tag>
```

### Database Rollback

Migration scripts include rollback comments. Execute manually:

```bash
docker exec -i altaviz-postgres psql -U postgres -d compressor_health <<'SQL'
-- Rollback migration 002 (example)
ALTER TABLE alert_history DROP COLUMN IF EXISTS organization_id;
ALTER TABLE maintenance_events DROP COLUMN IF EXISTS organization_id;
ALTER TABLE data_quality_metrics DROP COLUMN IF EXISTS organization_id;
SQL
```

## Database Migration Execution

```bash
# Local (Docker)
docker exec -i altaviz-postgres psql -U postgres -d compressor_health \
  < infrastructure/sql/migrations/NNN_description.sql

# Azure SQL
az sql db execute --name compressor_health \
  --server altaviz-server \
  --resource-group altaviz-rg \
  --query "$(cat infrastructure/sql/migrations/NNN_description.sql)"
```

## ETL Pipeline

### Running the Pipeline

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home \
PYSPARK_PYTHON=.venv/bin/python \
PYSPARK_DRIVER_PYTHON=.venv/bin/python \
PYTHONPATH=. \
.venv/bin/python src/etl/pyspark_pipeline.py
```

### Pipeline Skip Options

```bash
python src/etl/pyspark_pipeline.py --skip-bronze    # Reuse existing Bronze layer
python src/etl/pyspark_pipeline.py --skip-db         # Skip database export
python src/etl/pyspark_pipeline.py --skip-gold       # Skip Gold transformations
```

### Expected Output

- Duration: ~21 seconds end-to-end
- 10,080 sensor readings → 1,690 hourly aggregates (83% reduction)
- ~419 alerts (COMP-003: ~142, COMP-007: ~268)

## Common Failure Modes

### Database Connection Exhaustion

**Symptoms**: `TimeoutError: Connection pool timed out`, API responses slow or timing out

**Diagnosis**:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'compressor_health';
-- If > DB_POOL_MAX (default 20), connections are exhausted
```

**Resolution**:
1. Check for connection leaks (missing `client.release()`)
2. Increase `DB_POOL_MAX` env var
3. Reduce `DB_STATEMENT_TIMEOUT` to kill long-running queries
4. Restart the application (graceful shutdown releases pool)

### Stripe Webhook Failures

**Symptoms**: Billing events not reflected in `organizations` table, `billing_events` not logging

**Diagnosis**:
```bash
# Check Stripe webhook logs
stripe events list --limit 10

# Check billing_events table
SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 10;
```

**Resolution**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Check webhook endpoint URL in Stripe dashboard
3. Replay failed events: `stripe events resend evt_XXXXX`

### ETL Pipeline Failures

**Symptoms**: `pyspark_pipeline.py` exits with non-zero code

**Common causes**:
- Java 11 not found → Set `JAVA_HOME`
- Python version mismatch → Set `PYSPARK_PYTHON` to venv Python
- Database unreachable → Check Docker container is running
- FK constraint violation → Ensure metadata written before alerts (pipeline handles this)

**Resolution**:
```bash
# Check Docker containers
docker-compose ps

# Restart database
docker-compose restart postgres

# Run with skip flags to isolate failure stage
python src/etl/pyspark_pipeline.py --skip-bronze --skip-silver
```

### Rate Limiting False Positives

**Symptoms**: Legitimate users getting 429 responses

**Diagnosis**: Check if `x-forwarded-for` header is being set correctly by load balancer

**Resolution**:
1. Verify reverse proxy sets `X-Forwarded-For` header
2. Increase rate limit threshold if legitimate traffic is high
3. Consider Redis-based rate limiting for distributed deployments

## Agentic Workflow Troubleshooting

### Workflows Not Running

```bash
# Test via API key auth
curl -X POST https://<app-url>/api/workflows/run?workflow=all \
  -H "x-api-key: $WORKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "YOUR_ORG_UUID"}'
```

### Workflow Thresholds

Configurable via environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `WORKFLOW_ESCALATION_HOURS` | 4 | Hours before unacknowledged warnings escalate to critical |
| `WORKFLOW_STALENESS_HOURS` | 3 | Hours of no data before staleness alert |
| `WORKFLOW_CLEANUP_DAYS` | 7 | Days before unactioned alerts auto-acknowledge |

## Monitoring

### Application Insights Queries (KQL)

```kql
// API error rate (last 1 hour)
requests
| where timestamp > ago(1h)
| summarize errorRate = countif(resultCode >= 500) * 100.0 / count() by bin(timestamp, 5m)
| render timechart

// Slow API calls (> 2s)
requests
| where timestamp > ago(1h) and duration > 2000
| project timestamp, name, duration, resultCode
| order by duration desc

// Workflow execution events
customEvents
| where name == "workflow_executed"
| project timestamp, customDimensions.workflow, customDimensions.resultCount
| order by timestamp desc
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| Platform Lead | David Fernandez |
| Azure Admin | (Configure per organization) |
| On-Call Engineer | (Configure per organization) |
