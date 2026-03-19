# ADR-003: Bronze/Silver/Gold Medallion Architecture

## Status
Accepted

## Context
Altaviz processes 1.35M sensor readings/day from 4,700 compressors. The data must support:
- Real-time dashboards (sub-minute latency)
- ML model training (historical patterns)
- EPA compliance reporting (7-year retention, audit trail)
- Investigation agents (root cause analysis)

## Decision
Use the **Medallion Architecture** (Bronze → Silver → Gold → ML) on Delta Lake / OneLake.

### Bronze (Raw)
- **What**: Exact copy of source data, zero transformations
- **Why**: Immutability guarantees. If a bug in Silver cleaning loses data, Bronze is the recovery point
- **Partition**: `ingestion_date` (time-based queries, lifecycle policies)
- **Retention**: 7 years (EPA Subpart W compliance requirement)

### Silver (Cleaned)
- **What**: Deduplicated, null-handled, outlier-removed, type-validated
- **Why**: Single source of clean truth. All downstream consumers (Gold, ML, agents) read from Silver
- **Cleaning**: Composite dedup (compressor_id + timestamp), 4-sigma outlier removal, ABSOLUTE_BOUNDS
- **Partition**: `date`

### Gold (Curated)
- **What**: Rolling aggregations (1hr, 4hr, 24hr), derived metrics, threshold flags
- **Why**: Dashboard-optimized. Pre-computed aggregates avoid expensive real-time GROUP BYs
- **Partition**: `date` + `region` (most common dashboard filters)
- **Z-order**: `compressor_id` (most common point lookup)

### ML Serving
- **What**: Feature store, model predictions, anomaly scores
- **Why**: Separate from Gold to avoid coupling ML schema changes to dashboard schema

## Why Delta Lake
- ACID transactions (no partial writes during pipeline failures)
- Time travel (query historical snapshots for debugging)
- MERGE for upserts (idempotent writes, safe to re-run any stage)
- OPTIMIZE + ZORDER (query performance for common access patterns)
- VACUUM (storage management with configurable retention)

## Alternatives Considered
- **Single-table design**: Simpler but no incremental quality, no audit trail
- **Star schema in SQL**: Good for BI but poor for ML feature engineering
- **Lambda architecture**: Unnecessary complexity when Spark Structured Streaming handles both
- **Iceberg/Hudi**: Good alternatives to Delta Lake, but Delta has best Fabric integration

## Consequences
- Each stage is independently re-runnable (idempotent)
- Bronze→Silver→Gold ordering is enforced by pipeline.py (Template Method Pattern)
- Storage cost increases (~3x raw data due to three copies + ML)
- Query performance is excellent due to partition pruning and Z-ordering
