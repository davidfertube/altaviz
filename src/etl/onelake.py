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
        """Detect if running inside Fabric Spark runtime."""
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

        # Local filesystem fallback
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

        # Enable optimized writes in Fabric
        writer = writer.option("optimizeWrite", "true")
        writer = writer.option("mergeSchema", "true")

        writer.save(path)

        row_count = df.count()
        logger.info(f"Written {row_count:,} rows to {path}")

        if optimize_after:
            self.optimize_table(path, layer)

        return row_count

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
