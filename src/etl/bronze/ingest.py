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

    # Add ingestion metadata (no other transformations)
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
