"""
Compressor Health ETL Pipeline

This package contains the PySpark-based ETL pipeline for processing
compressor sensor data through Bronze → Silver → Gold layers.

Modules:
    schemas: Explicit PySpark schemas for data loading
    utils: Configuration loading and Spark session management
    data_quality: Data validation and quality checks
    transformations: Feature engineering and aggregations
    database_writer: PostgreSQL data persistence
    pyspark_pipeline: Main ETL orchestrator
"""

__version__ = "1.0.0"
__author__ = "David Fernandez"
