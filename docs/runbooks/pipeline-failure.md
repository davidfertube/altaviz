# Runbook: ETL Pipeline Failure

## Symptoms
- Dashboard shows stale data (readings older than 15 minutes)
- Azure Monitor alert fires for pipeline stage failure
- Teams webhook notification received

## Diagnosis Steps

### 1. Check pipeline status
```bash
# Check recent pipeline runs (if using Fabric)
az monitor log-analytics query \
  --workspace $LOG_ANALYTICS_WORKSPACE_ID \
  --analytics-query "AppTraces | where Message contains 'pipeline' | order by TimeGenerated desc | take 10"

# Check local logs
grep -i "error\|failed\|exception" logs/pipeline.log | tail -20
```

### 2. Identify which stage failed
The pipeline runs stages in order: Bronze → Silver → Gold → ML.
Each stage logs start/end markers:
```
[INFO] Starting stage: bronze_ingest
[ERROR] Stage failed: silver_cleanse — NullPointerException in dedup
```

### 3. Common failures and fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Bronze ingest timeout | Event Hubs connection lost | Check `EVENTHUB_CONNECTION_STRING`, restart pipeline |
| Silver dedup fails | Schema mismatch (new column) | Update `src/etl/schemas.py`, re-run Silver |
| Gold aggregation OOM | Shuffle partition too low | Increase `spark.sql.shuffle.partitions` in config |
| ML batch predictor fails | Model file missing | Run `python3 -m src.ml.serving.model_registry --list` |
| Delta MERGE conflict | Concurrent writes | Wait and retry (Delta handles this automatically) |

### 4. Re-run a failed stage
Each stage is idempotent — safe to re-run:
```bash
# Re-run just Silver cleaning
python3 -m src.etl.pipeline --stage silver

# Re-run just Gold aggregation
python3 -m src.etl.pipeline --stage gold

# Re-run just ML inference
python3 -m src.etl.pipeline --stage ml
```

### 5. Check data freshness
```bash
# Query latest reading timestamp
psql $DATABASE_URL -c "SELECT MAX(agg_timestamp) FROM sensor_readings_agg WHERE window_type='1hr'"
```
If more than 15 minutes stale, escalate.

## Escalation
1. Check if this is a known Azure outage: status.azure.com
2. Notify Kunal Sharma if data is >1 hour stale
3. If Event Hubs is down, switch to batch mode: `python3 -m src.etl.pipeline --mode batch`
