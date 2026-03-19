"""
Bronze Layer — Raw Data Ingestion to OneLake

Bronze layer is the immutable landing zone. Data arrives exactly as received
from IoT devices / Event Hubs with only ingestion metadata added:
- bronze_ingested_at (processing timestamp)
- ingestion_date (partition key)
- source_system (origin identifier)

No cleaning, no transformations, no filtering.

Scale: 1.35M readings/day (4,700 compressors x 288 readings)
Storage: ~270 MB/day, partitioned by ingestion_date

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: Bronze Layer Immutability (Raw Data Preservation)
# WHY: Bronze is the "source of truth" — raw data exactly as received from
#      IoT devices. We NEVER modify, filter, or transform source data in
#      Bronze. Only three ingestion metadata columns are added:
#      - bronze_ingested_at: When the pipeline received this record
#      - ingestion_date: Partition key derived from the event timestamp
#      - source_system: Where this data came from (lineage tracking)
#      This immutability is critical because if a bug is found in Silver
#      or Gold transformation logic, we can re-derive everything from
#      Bronze without going back to the IoT devices. It also satisfies
#      EPA 7-year data retention requirements — we can prove the original
#      sensor readings were never tampered with.
# SCALING: Bronze grows unbounded (append-only). At 270 MB/day,
#          that is ~100 GB/year. Implement lifecycle policies to tier
#          data older than 1 year to cool/archive storage (Delta Lake
#          supports this via Azure Blob Storage lifecycle management).
# ALTERNATIVE: Could overwrite Bronze daily (smaller storage), but that
#              destroys the ability to re-process historical data or
#              audit past pipeline runs. Never do this.
# ===========================================================================

# ===========================================================================
# PATTERN: Partition by ingestion_date (Time-Based Access Patterns)
# WHY: Partitioning by ingestion_date creates a directory structure like:
#      sensor_readings/ingestion_date=2026-03-19/part-00001.parquet
#      This enables partition pruning: when the Silver layer reads "last
#      10 days of Bronze", Spark only scans 10 directories instead of
#      the entire table. Without partitioning, every query would scan
#      ALL historical data (years of readings).
# SCALING: At 4,700 compressors, each daily partition is ~270 MB —
#          a comfortable size for Parquet files (not too many small files,
#          not too large to cause memory pressure during reads).
# ALTERNATIVE: Could partition by basin (10 partitions) for geographic
#              queries, but time-based access is the dominant pattern
#              for ETL (process recent data). Basin filtering is handled
#              at the Gold layer via Z-ordering.
# ===========================================================================

import logging
from datetime import datetime
from typing import Optional

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


def ingest_to_bronze(
    spark: SparkSession,
    source_df: DataFrame,
    onelake_client=None,
    source_system: str = "fleet_simulator",
) -> int:
    """
    Write raw sensor data to Bronze layer on OneLake.

    Adds ingestion metadata columns but NEVER modifies source data.

    Args:
        spark: Active SparkSession
        source_df: Raw sensor DataFrame (from Event Hubs or file)
        onelake_client: OneLakeClient instance
        source_system: Source identifier for lineage tracking

    Returns:
        Number of rows ingested
    """
    if onelake_client is None:
        from src.etl.onelake import OneLakeClient
        onelake_client = OneLakeClient(spark)

    logger.info("BRONZE LAYER: Ingesting raw sensor data")

    # Add ingestion metadata (no other transformations).
    # Uses a single .select() call with F.col("*") to pass through ALL
    # source columns unchanged, then adds metadata columns. This pattern
    # avoids chained .withColumn() calls which create a new DataFrame per
    # call (O(n) plan complexity). A single .select() is O(1) regardless
    # of how many columns are added.
    enriched = source_df.select(
        F.col("*"),
        F.current_timestamp().alias("bronze_ingested_at"),
        F.to_date(F.col("timestamp")).alias("ingestion_date"),
        F.lit(source_system).alias("source_system"),
    )

    row_count = onelake_client.write_table(
        enriched,
        layer="bronze",
        table="sensor_readings",
        mode="append",
        partition_by=["ingestion_date"],
    )

    logger.info(f"Bronze ingestion complete: {row_count:,} rows")
    return row_count


# ===========================================================================
# PATTERN: Slowly Changing Dimension (SCD Type 1 — Overwrite)
# WHY: Compressor metadata (model, station, horsepower) changes rarely —
#      perhaps when a unit is relocated to a new station or upgraded.
#      Unlike sensor readings (append-only), metadata uses mode="overwrite"
#      because we always want the CURRENT state of each compressor. There
#      is no need for historical versions of metadata (if needed, that
#      would be SCD Type 2 with effective dates).
# SCALING: Metadata is tiny (4,700 rows, ~200 KB). Overwriting is
#          instantaneous. This table is broadcast-joined with sensor
#          readings in downstream processing (broadcast() for small tables).
# ALTERNATIVE: SCD Type 2 (keep history with effective_from/effective_to
#              dates) if we needed to know which station a compressor was
#              at on a specific historical date. Not needed currently.
# ===========================================================================
def ingest_metadata_to_bronze(
    spark: SparkSession,
    metadata_df: DataFrame,
    onelake_client=None,
) -> int:
    """
    Write compressor metadata to Bronze layer.

    Metadata is overwritten (not appended) since it's a slowly-changing dimension.
    """
    if onelake_client is None:
        from src.etl.onelake import OneLakeClient
        onelake_client = OneLakeClient(spark)

    logger.info("BRONZE: Ingesting compressor metadata")

    enriched = metadata_df.select(
        F.col("*"),
        F.current_timestamp().alias("bronze_ingested_at"),
        F.lit("fleet_registry").alias("source_system"),
    )

    row_count = onelake_client.write_table(
        enriched,
        layer="bronze",
        table="compressor_metadata",
        mode="overwrite",
    )

    logger.info(f"Bronze metadata ingestion complete: {row_count:,} rows")
    return row_count


def ingest_maintenance_to_bronze(
    spark: SparkSession,
    maintenance_df: DataFrame,
    onelake_client=None,
) -> int:
    """Write maintenance events to Bronze layer."""
    if onelake_client is None:
        from src.etl.onelake import OneLakeClient
        onelake_client = OneLakeClient(spark)

    logger.info("BRONZE: Ingesting maintenance events")

    enriched = maintenance_df.select(
        F.col("*"),
        F.current_timestamp().alias("bronze_ingested_at"),
        F.lit("maintenance_system").alias("source_system"),
    )

    row_count = onelake_client.write_table(
        enriched,
        layer="bronze",
        table="maintenance_events",
        mode="append",
    )

    logger.info(f"Bronze maintenance ingestion complete: {row_count:,} rows")
    return row_count


# ===========================================================================
# PATTERN: Partition Pruning for Efficient Reads
# WHY: When days is specified, read_bronze constructs a partition filter
#      (ingestion_date >= cutoff) that lets Spark skip all partitions
#      outside the date range. This is the difference between scanning
#      10 days (~2.7 GB) vs. the entire Bronze history (100+ GB/year).
#      The default pipeline reads 10 days to capture any late-arriving
#      data that might not have been processed yet.
# SCALING: Without partition pruning at 4,700 compressors, a full Bronze
#          scan after 1 year would read ~100 GB. With pruning, the daily
#          pipeline only reads ~2.7 GB — a 37x reduction.
# ===========================================================================
def read_bronze(
    spark: SparkSession,
    onelake_client=None,
    days: Optional[int] = None,
) -> DataFrame:
    """
    Read sensor readings from Bronze layer.

    Args:
        days: If set, only read last N days (partition pruning)
    """
    if onelake_client is None:
        from src.etl.onelake import OneLakeClient
        onelake_client = OneLakeClient(spark)

    if days:
        return onelake_client.read_recent("bronze", "sensor_readings", days=days, date_column="ingestion_date")

    return onelake_client.read_table("bronze", "sensor_readings")
