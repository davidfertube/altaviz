"""
Feature Store — Centralized Feature Management for ML Models

Provides a single source of truth for ML features computed from
the Gold layer. Ensures consistency between training and serving.

Feature sets:
1. vibration_features — Rolling stats on vibration sensor
2. thermal_features — Temperature trends and rates
3. pressure_features — Pressure differential metrics
4. operational_features — HP, flow, operating hours
5. temporal_features — Time-of-day, weekday patterns

At 4,700 compressors:
- Feature table: ~112K rows (hourly, last 24 hours)
- Latest features: ~4,700 rows (one per compressor)
- Storage: OneLake ML lakehouse feature_store table

Author: David Fernandez
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

logger = logging.getLogger(__name__)

# Feature definitions
FEATURE_SETS = {
    'vibration': [
        'vibration_mean', 'vibration_std', 'vibration_max', 'vibration_min',
    ],
    'thermal': [
        'discharge_temp_mean', 'discharge_temp_max', 'discharge_temp_rate_of_change',
    ],
    'pressure': [
        'suction_pressure_mean', 'discharge_pressure_mean', 'pressure_delta_mean',
    ],
    'operational': [
        'horsepower_mean', 'gas_flow_mean',
    ],
    'anomaly_model': [
        'vibration_mean', 'vibration_std', 'vibration_max',
        'discharge_temp_mean', 'discharge_temp_rate_of_change',
        'pressure_delta_mean', 'horsepower_mean',
    ],
}


class FeatureStore:
    """
    Feature store backed by OneLake Delta tables.

    Provides:
    - compute_features(): Transform Gold hourly to feature vectors
    - get_latest_features(): Get current feature vector per compressor
    - get_training_features(): Get historical features for model training
    - write_features(): Persist features to OneLake
    """

    def __init__(self, spark: SparkSession, onelake_client=None):
        self.spark = spark

        if onelake_client is None:
            from src.etl.onelake import OneLakeClient
            self.onelake_client = OneLakeClient(spark)
        else:
            self.onelake_client = onelake_client

    def compute_features(
        self,
        gold_hourly_df: DataFrame,
        feature_set: str = "anomaly_model",
    ) -> DataFrame:
        """
        Compute feature vectors from Gold hourly aggregates.

        Adds cross-window features that combine multiple time horizons
        for more predictive signals.

        Args:
            gold_hourly_df: Hourly aggregated Gold DataFrame
            feature_set: Name of feature set to compute

        Returns:
            DataFrame with feature columns per compressor-timestamp
        """
        features = FEATURE_SETS.get(feature_set, FEATURE_SETS['anomaly_model'])
        available = [f for f in features if f in gold_hourly_df.columns]

        if not available:
            logger.warning(f"No features available from set '{feature_set}'")
            return gold_hourly_df

        # Select base features
        base_cols = ['compressor_id', 'agg_timestamp']
        if 'station_id' in gold_hourly_df.columns:
            base_cols.append('station_id')
        if 'basin' in gold_hourly_df.columns:
            base_cols.append('basin')

        feature_df = gold_hourly_df.select(
            *[F.col(c) for c in base_cols],
            *[F.col(c) for c in available],
        )

        # Add rolling cross-window features
        w_4hr = (
            Window.partitionBy("compressor_id")
            .orderBy(F.col("agg_timestamp").cast("long"))
            .rowsBetween(-3, 0)
        )
        w_24hr = (
            Window.partitionBy("compressor_id")
            .orderBy(F.col("agg_timestamp").cast("long"))
            .rowsBetween(-23, 0)
        )

        if 'vibration_mean' in available:
            feature_df = feature_df.select(
                F.col("*"),
                F.avg("vibration_mean").over(w_4hr).alias("vibration_4hr_rolling_mean"),
                F.avg("vibration_mean").over(w_24hr).alias("vibration_24hr_rolling_mean"),
                # Trend: current / 24hr average (> 1.0 = increasing)
                (F.col("vibration_mean") /
                 F.coalesce(F.avg("vibration_mean").over(w_24hr), F.lit(1.0))
                ).alias("vibration_trend_ratio"),
            )

        if 'discharge_temp_mean' in available:
            feature_df = feature_df.select(
                F.col("*"),
                F.avg("discharge_temp_mean").over(w_4hr).alias("temp_4hr_rolling_mean"),
                F.max("discharge_temp_mean").over(w_24hr).alias("temp_24hr_max"),
            )

        # Add metadata
        feature_df = feature_df.select(
            F.col("*"),
            F.lit(feature_set).alias("feature_set"),
            F.current_timestamp().alias("computed_at"),
        )

        return feature_df

    def get_latest_features(
        self,
        gold_hourly_df: DataFrame,
        feature_set: str = "anomaly_model",
    ) -> DataFrame:
        """
        Get the most recent feature vector per compressor.

        Returns exactly one row per compressor with the latest features.
        """
        feature_df = self.compute_features(gold_hourly_df, feature_set)

        w = Window.partitionBy("compressor_id").orderBy(F.desc("agg_timestamp"))
        latest = (
            feature_df.withColumn("_rank", F.row_number().over(w))
            .filter(F.col("_rank") == 1)
            .drop("_rank")
        )

        return latest

    def get_training_features(
        self,
        gold_hourly_df: DataFrame,
        feature_set: str = "anomaly_model",
        exclude_compressors: Optional[List[str]] = None,
        days: int = 30,
    ) -> DataFrame:
        """
        Get historical features for model training.

        Args:
            gold_hourly_df: Source data
            feature_set: Feature set name
            exclude_compressors: Compressors to exclude (known failures)
            days: Days of history to include
        """
        feature_df = self.compute_features(gold_hourly_df, feature_set)

        cutoff = datetime.now() - timedelta(days=days)
        feature_df = feature_df.filter(F.col("agg_timestamp") >= F.lit(cutoff))

        if exclude_compressors:
            feature_df = feature_df.filter(
                ~F.col("compressor_id").isin(exclude_compressors)
            )

        return feature_df

    def write_features(
        self,
        feature_df: DataFrame,
        feature_set: str = "anomaly_model",
    ):
        """Write computed features to OneLake feature store table."""
        self.onelake_client.upsert_table(
            feature_df,
            layer="ml",
            table="features",
            merge_keys=["compressor_id", "agg_timestamp", "feature_set"],
        )

        count = feature_df.count()
        logger.info(f"Feature store updated: {count:,} rows ({feature_set})")

    def get_feature_stats(self, feature_df: DataFrame) -> Dict:
        """Compute feature statistics for data drift monitoring."""
        stats = {}
        numeric_cols = [
            f.name for f in feature_df.schema.fields
            if str(f.dataType) in ('DoubleType()', 'FloatType()')
        ]

        for col in numeric_cols:
            col_stats = feature_df.select(
                F.avg(col).alias("mean"),
                F.stddev(col).alias("std"),
                F.min(col).alias("min"),
                F.max(col).alias("max"),
                F.expr(f"percentile({col}, 0.5)").alias("median"),
            ).collect()[0]

            stats[col] = {
                'mean': col_stats['mean'],
                'std': col_stats['std'],
                'min': col_stats['min'],
                'max': col_stats['max'],
                'median': col_stats['median'],
            }

        return stats
