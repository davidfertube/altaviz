"""
Compressor Health ETL Pipeline

Production pipeline: Bronze → Silver → Gold medallion architecture.

Modules:
    schemas: Explicit PySpark schemas for data loading
    utils: Configuration loading and Spark session management
    pipeline: Production orchestrator (OneLake, Fabric)
    onelake: OneLake read/write client
    bronze.ingest: Bronze layer ingestion
    silver.cleanse: Silver layer cleaning
    silver.quality: Data quality framework
    gold.aggregate: Gold layer aggregations and alerts
"""

__version__ = "1.0.0"
__author__ = "David Fernandez"
