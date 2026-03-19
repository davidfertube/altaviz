"""
OneLake Integration — Read/Write Utilities for Azure Fabric Lakehouses

Provides a unified interface for accessing OneLake Delta tables via ABFS protocol.
Handles path resolution, authentication, and optimized read/write patterns.

OneLake path format:
    abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>/<table-path>

Authentication:
    - In Fabric notebooks: automatic via workspace identity
    - In standalone Spark: Azure AD service principal or managed identity
    - For local dev: falls back to local filesystem paths

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: ABFS Protocol for OneLake Access
# WHY: Azure Blob File System (ABFS) protocol provides a Hadoop-compatible
#      filesystem interface to OneLake/ADLS Gen2. The format is:
#      abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>/
#      The 's' in 'abfss' means SSL (always encrypted in transit).
#      This lets Spark read/write OneLake exactly like HDFS — no custom
#      connectors needed. Delta Lake operations (MERGE, OPTIMIZE, VACUUM)
#      work natively because Delta just needs a filesystem abstraction.
# SCALING: ABFS supports parallel reads across partitions, so reading
#          1.35M rows/day from Bronze is distributed across Spark executors
#          automatically. No single-node bottleneck.
# ALTERNATIVE: Could use the OneLake REST API directly, but ABFS gives us
#              native Spark integration, partition pruning, and predicate
#              pushdown for free.
# ===========================================================================

# ===========================================================================
# PATTERN: Environment-Adaptive Client (Fabric vs Local)
# WHY: The same codebase must run in Azure Fabric notebooks (production)
#      and on developer laptops (local). The OneLakeClient auto-detects
#      which environment it is in by checking for Fabric-specific Spark
#      configs (spark.fabric.workspace.id). In Fabric, it uses ABFS paths
#      with workspace identity auth. Locally, it falls back to the local
#      filesystem (data/processed/delta/...) so developers can test the
#      full pipeline without Azure credentials.
# SCALING: In Fabric, reads/writes go through the distributed OneLake
#          storage layer (built on ADLS Gen2). Locally, everything is
#          single-node — adequate for 10-100 compressor test runs.
# ALTERNATIVE: Could use environment variables to toggle mode, but
#              auto-detection is less error-prone (no forgotten config).
# ===========================================================================

import os
import logging
from typing import Optional, List
from datetime import datetime, timedelta

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


class OneLakeClient:
    """
    Client for reading and writing Delta tables on OneLake.

    Abstracts the ABFS path construction and provides:
    - Automatic path resolution (OneLake vs local filesystem)
    - Optimized write patterns (auto-compact, Z-order)
    - Partition pruning helpers
    - Delta table maintenance (VACUUM, OPTIMIZE)
    """

    def __init__(self, spark: SparkSession, config: Optional[dict] = None):
        self.spark = spark
        self.config = config or self._load_config()
        self.is_fabric = self._detect_fabric_environment()

        if self.is_fabric:
            logger.info("OneLake client initialized (Fabric environment detected)")
        else:
            logger.info("OneLake client initialized (local filesystem mode)")

    def _load_config(self) -> dict:
        """Load Fabric config from YAML."""
        try:
            from src.etl.utils import load_config
            return load_config('fabric_config.yaml')
        except Exception:
            logger.warning("Could not load fabric_config.yaml, using defaults")
            return {}

    def _detect_fabric_environment(self) -> bool:
        """Detect if running inside Fabric Spark runtime.

        Fabric's managed Spark runtime automatically sets
        spark.fabric.workspace.id in the SparkContext configuration.
        If this config exists and is non-empty, we know we are running
        inside a Fabric notebook or Fabric Spark job — so we use ABFS
        paths and workspace identity authentication.
        """
        try:
            sc = self.spark.sparkContext
            # Fabric sets specific Spark configs
            fabric_workspace = sc.getConf().get("spark.fabric.workspace.id", "")
            return bool(fabric_workspace)
        except Exception:
            return False

    def get_lakehouse_path(self, layer: str) -> str:
        """
        Get the base path for a lakehouse layer.

        Args:
            layer: One of 'bronze', 'silver', 'gold', 'ml'

        Returns:
            ABFS path (Fabric) or local path (development)
        """
        if self.is_fabric:
            lakehouses = self.config.get('lakehouses', {})
            lh = lakehouses.get(layer, {})
            return lh.get('path', f'Tables/{layer}')

        # Local filesystem fallback for development without Azure.
        # Mirrors the OneLake lakehouse structure using local directories
        # so the same Delta read/write code works in both environments.
        local_paths = {
            'bronze': 'data/processed/delta/sensors_bronze',
            'silver': 'data/processed/delta/sensors_silver',
            'gold': 'data/processed/delta/sensors_gold',
            'ml': 'data/processed/delta/ml_serving',
        }
        return local_paths.get(layer, f'data/processed/delta/{layer}')

    def get_table_path(self, layer: str, table: str) -> str:
        """
        Get the full path for a specific table.

        Args:
            layer: Lakehouse layer
            table: Table name from config

        Returns:
            Full path to Delta table
        """
        base = self.get_lakehouse_path(layer)
        tables = self.config.get('tables', {}).get(layer, {})
        table_suffix = tables.get(table, f'Tables/{table}')
        return f"{base}/{table_suffix}"

    # ========================================================================
    # READ OPERATIONS
    # ========================================================================

    def read_table(
        self,
        layer: str,
        table: str,
        partition_filter: Optional[str] = None,
        columns: Optional[List[str]] = None,
    ) -> DataFrame:
        """
        Read a Delta table from OneLake.

        Args:
            layer: Lakehouse layer
            table: Table name
            partition_filter: SQL filter for partition pruning
            columns: Specific columns to read (projection pushdown)
        """
        path = self.get_table_path(layer, table)
        logger.info(f"Reading Delta table: {path}")

        df = self.spark.read.format("delta").load(path)

        if partition_filter:
            df = df.filter(partition_filter)
            logger.info(f"Applied partition filter: {partition_filter}")

        if columns:
            df = df.select(*columns)

        return df

    def read_recent(
        self,
        layer: str,
        table: str,
        days: int = 7,
        date_column: str = "date",
    ) -> DataFrame:
        """
        Read recent data with automatic partition pruning.

        Optimized for common pattern: "give me the last N days of data"
        """
        cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        partition_filter = f"{date_column} >= '{cutoff}'"
        return self.read_table(layer, table, partition_filter=partition_filter)

    def read_latest_per_compressor(
        self,
        layer: str,
        table: str,
        timestamp_col: str = "timestamp",
    ) -> DataFrame:
        """
        Read the latest reading per compressor (deduplication pattern).

        Uses window function to rank by timestamp and take the most recent.
        """
        from pyspark.sql.window import Window

        df = self.read_table(layer, table)

        window = Window.partitionBy("compressor_id").orderBy(F.desc(timestamp_col))
        latest = (
            df.withColumn("_rank", F.row_number().over(window))
            .filter(F.col("_rank") == 1)
            .drop("_rank")
        )

        return latest

    # ========================================================================
    # WRITE OPERATIONS
    # ========================================================================

    def write_table(
        self,
        df: DataFrame,
        layer: str,
        table: str,
        mode: str = "append",
        partition_by: Optional[List[str]] = None,
        optimize_after: bool = False,
    ):
        """
        Write a DataFrame to a Delta table on OneLake.

        Args:
            df: DataFrame to write
            layer: Target lakehouse layer
            table: Target table name
            mode: Write mode ('append', 'overwrite', 'merge')
            partition_by: Partition columns
            optimize_after: Run OPTIMIZE after write
        """
        path = self.get_table_path(layer, table)
        logger.info(f"Writing to Delta table: {path} (mode={mode})")

        if partition_by is None:
            partition_config = self.config.get('partitioning', {}).get(layer, {})
            partition_by = partition_config.get('partition_by', [])

        writer = df.write.format("delta").mode(mode)

        if partition_by:
            writer = writer.partitionBy(*partition_by)

        # Enable optimized writes in Fabric.
        # optimizeWrite: Fabric-specific optimization that automatically
        #   coalesces small partitions during writes to reduce small files.
        # mergeSchema: Allows adding new columns without breaking existing
        #   reads. This supports schema evolution (add fields, never remove)
        #   — critical when IoT devices get firmware updates that add new
        #   sensor types. Old data gets nulls for new columns automatically.
        writer = writer.option("optimizeWrite", "true")
        writer = writer.option("mergeSchema", "true")

        writer.save(path)

        row_count = df.count()
        logger.info(f"Written {row_count:,} rows to {path}")

        if optimize_after:
            self.optimize_table(path, layer)

        return row_count

    # ===========================================================================
    # PATTERN: Delta MERGE for Idempotent Upserts
    # WHY: MERGE (also called "upsert") atomically matches source rows
    #      against target rows on a composite key, then updates existing
    #      rows and inserts new ones — all in a single transaction. This
    #      makes writes idempotent: running the same data through MERGE
    #      twice produces the same result (no duplicates). This is critical
    #      for late-data reconciliation and pipeline re-runs after failures.
    # SCALING: Delta MERGE on 4,700 compressors is efficient because the
    #          merge_keys (compressor_id + timestamp) match the Z-order
    #          columns, so Delta can skip most files during the match phase.
    # ALTERNATIVE: Could use overwrite-by-partition (replaceWhere), but
    #              that risks data loss if the source DataFrame is incomplete.
    #              MERGE is safer because it only touches matched rows.
    # ===========================================================================
    def upsert_table(
        self,
        df: DataFrame,
        layer: str,
        table: str,
        merge_keys: List[str],
    ):
        """
        Upsert (MERGE) into a Delta table.

        Uses Delta MERGE for idempotent writes:
        - Update existing rows (matched on merge_keys)
        - Insert new rows

        Args:
            df: Source DataFrame
            layer: Target lakehouse layer
            table: Target table name
            merge_keys: Columns to match on
        """
        from delta.tables import DeltaTable

        path = self.get_table_path(layer, table)
        logger.info(f"Upserting to Delta table: {path} (keys: {merge_keys})")

        try:
            target = DeltaTable.forPath(self.spark, path)
        except Exception:
            # Table doesn't exist yet, create it
            logger.info(f"Table {path} doesn't exist, creating...")
            self.write_table(df, layer, table, mode="overwrite")
            return

        merge_condition = " AND ".join(
            f"target.{key} = source.{key}" for key in merge_keys
        )

        (
            target.alias("target")
            .merge(df.alias("source"), merge_condition)
            .whenMatchedUpdateAll()
            .whenNotMatchedInsertAll()
            .execute()
        )

        logger.info(f"Upsert complete to {path}")

    # ========================================================================
    # TABLE MAINTENANCE
    # ========================================================================

    # ===========================================================================
    # PATTERN: OPTIMIZE + ZORDER for Query Performance
    # WHY: Streaming micro-batches (every 5 minutes) create many small
    #      Parquet files. OPTIMIZE compacts them into larger files (~1GB
    #      target size), which dramatically improves read performance by
    #      reducing file listing overhead and enabling better compression.
    #      Z-ORDER physically co-locates data by compressor_id within
    #      each file, so queries filtering by compressor_id skip most
    #      files entirely (data skipping via min/max statistics).
    # SCALING: Without OPTIMIZE, after 1 day of streaming we would have
    #          ~288 small files per partition (one per 5-min trigger).
    #          With OPTIMIZE, these compact into 1-2 files per partition.
    #          Z-ordering by compressor_id means a query for a single
    #          compressor scans ~0.02% of data instead of 100%.
    # ALTERNATIVE: Could use auto-compaction (Delta Lake feature), but
    #              explicit OPTIMIZE gives us control over timing (run
    #              after batch writes, not during streaming hot path).
    # ===========================================================================
    def optimize_table(self, path: str = None, layer: str = None, table: str = None):
        """
        Run OPTIMIZE on a Delta table (compacts small files).

        Critical for streaming workloads that create many small files.
        """
        if path is None:
            path = self.get_table_path(layer, table)

        logger.info(f"Optimizing table: {path}")
        self.spark.sql(f"OPTIMIZE delta.`{path}`")

        # Z-order if configured
        z_order_cols = (
            self.config.get('partitioning', {})
            .get(layer or 'gold', {})
            .get('z_order_by', [])
        )
        if z_order_cols:
            z_order_str = ", ".join(z_order_cols)
            self.spark.sql(f"OPTIMIZE delta.`{path}` ZORDER BY ({z_order_str})")
            logger.info(f"Z-ordered by: {z_order_str}")

    # ===========================================================================
    # PATTERN: VACUUM with 168-Hour Retention (7 Days)
    # WHY: Delta Lake keeps old versions of data files for time travel
    #      (querying historical snapshots). VACUUM removes files that
    #      are no longer referenced by any version within the retention
    #      period. 168 hours (7 days) balances two concerns:
    #      1. Time travel: lets us query data as it was up to 7 days ago
    #         (useful for debugging and auditing pipeline issues).
    #      2. Storage cost: without VACUUM, old files accumulate forever.
    #         At 270 MB/day Bronze, that is ~100 GB/year of dead files.
    # SCALING: VACUUM scans the Delta log to find unreferenced files,
    #          then deletes them. For a table with 1.35M rows/day, this
    #          takes seconds because it operates on file metadata, not
    #          row-level data.
    # ALTERNATIVE: Could set retention to 0 hours (no time travel) to
    #              save more storage, but that removes the ability to
    #              roll back corrupted writes — too risky in production.
    # ===========================================================================
    def vacuum_table(self, path: str = None, layer: str = None, table: str = None, hours: int = 168):
        """
        Run VACUUM to remove old Delta log files.

        Args:
            hours: Retention period (default: 168 = 7 days)
        """
        if path is None:
            path = self.get_table_path(layer, table)

        logger.info(f"Vacuuming table: {path} (retain {hours}h)")
        self.spark.sql(f"VACUUM delta.`{path}` RETAIN {hours} HOURS")

    def get_table_stats(self, layer: str, table: str) -> dict:
        """Get statistics for a Delta table (row count, size, partitions)."""
        path = self.get_table_path(layer, table)

        try:
            df = self.spark.read.format("delta").load(path)
            count = df.count()

            from delta.tables import DeltaTable
            dt = DeltaTable.forPath(self.spark, path)
            history = dt.history(1).collect()

            return {
                'path': path,
                'row_count': count,
                'last_operation': history[0]['operation'] if history else None,
                'last_updated': history[0]['timestamp'] if history else None,
            }
        except Exception as e:
            return {'path': path, 'error': str(e)}
