"""
ETL Utility Functions

This module provides utility functions for the ETL pipeline including:
- Configuration file loading with environment variable substitution
- Spark session creation with Delta Lake extensions
- Logging setup
- Common helper functions

These utilities are used across all ETL modules to maintain consistency.

Author: David Fernandez
"""

import os
import yaml
import logging
import re
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Import PySpark
from pyspark.sql import SparkSession
from pyspark.conf import SparkConf


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(log_level=None):
    """
    Configure logging for the ETL pipeline.

    Creates a logger with:
    - Console output with timestamps
    - Structured logging format
    - Configurable log level from environment or parameter

    Args:
        log_level (str, optional): Log level ('DEBUG', 'INFO', 'WARNING', 'ERROR')
                                   If None, reads from LOG_LEVEL environment variable

    Returns:
        logging.Logger: Configured logger instance

    Example:
        >>> logger = setup_logging()
        >>> logger.info("ETL pipeline started")
        2024-02-05 10:30:15 [INFO] ETL pipeline started
    """
    # Get log level from parameter or environment (default to INFO)
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO')

    # Configure logging format
    # Includes: timestamp, log level, and message
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    logger = logging.getLogger('CompressorHealthETL')
    return logger


# ============================================================================
# CONFIGURATION LOADING
# ============================================================================

def substitute_env_vars(config: Any) -> Any:
    """
    Recursively substitute environment variables in configuration.

    Supports format: ${VAR_NAME:-default_value}
    - ${DB_HOST} -> reads DB_HOST environment variable
    - ${DB_HOST:-localhost} -> reads DB_HOST or uses 'localhost' as default

    Args:
        config: Configuration object (dict, list, str, etc.)

    Returns:
        Configuration with environment variables substituted

    Example:
        >>> config = {"host": "${DB_HOST:-localhost}"}
        >>> result = substitute_env_vars(config)
        >>> print(result)
        {'host': 'localhost'}  # Assuming DB_HOST not set
    """
    # Pattern to match ${VAR_NAME:-default}
    env_var_pattern = re.compile(r'\$\{([^}:]+)(?::-([^}]+))?\}')

    def replace_env_var(match):
        var_name = match.group(1)
        default_value = match.group(2) if match.group(2) else ''
        return os.getenv(var_name, default_value)

    # Handle different data types
    if isinstance(config, dict):
        # Recursively process dictionary values
        return {key: substitute_env_vars(value) for key, value in config.items()}

    elif isinstance(config, list):
        # Recursively process list items
        return [substitute_env_vars(item) for item in config]

    elif isinstance(config, str):
        # Substitute environment variables in strings
        return env_var_pattern.sub(replace_env_var, config)

    else:
        # Return other types as-is (int, float, bool, etc.)
        return config


def load_config(config_filename: str) -> Dict[str, Any]:
    """
    Load YAML configuration file with environment variable substitution.

    Looks for config file in: <project_root>/config/<config_filename>

    Args:
        config_filename (str): Name of config file (e.g., 'database.yaml')

    Returns:
        dict: Configuration dictionary with env vars substituted

    Raises:
        FileNotFoundError: If config file doesn't exist
        yaml.YAMLError: If YAML syntax is invalid

    Example:
        >>> db_config = load_config('database.yaml')
        >>> print(db_config['database']['host'])
        'localhost'
    """
    # Get path to config file
    # Go up from src/etl/ to project root, then into config/
    config_dir = Path(__file__).parent.parent.parent / 'config'
    config_path = config_dir / config_filename

    # Check if file exists
    if not config_path.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {config_path}\\n"
            f"Expected location: config/{config_filename}"
        )

    # Load YAML file
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    # Substitute environment variables
    config = substitute_env_vars(config)

    return config


# ============================================================================
# SPARK SESSION MANAGEMENT
# ============================================================================

def create_spark_session(app_name=None) -> SparkSession:
    """
    Create and configure a Spark session with Delta Lake extensions.

    Configuration includes:
    - Delta Lake support for ACID transactions
    - Adaptive Query Execution (AQE) for optimization
    - Memory settings for local development
    - Arrow optimization for Pandas conversion

    Args:
        app_name (str, optional): Spark application name
                                 If None, reads from etl_config.yaml

    Returns:
        SparkSession: Configured Spark session

    Example:
        >>> spark = create_spark_session()
        >>> df = spark.read.parquet('data/raw/sensor_readings.parquet')

    Note:
        Only one Spark session should exist at a time.
        Calling this multiple times returns the same session (getOrCreate).
    """
    # Load ETL configuration
    etl_config = load_config('etl_config.yaml')
    spark_config = etl_config['spark']

    # Use provided app name or default from config
    if app_name is None:
        app_name = spark_config['app_name']

    # Build Spark configuration
    conf = SparkConf()
    conf.setAppName(app_name)
    conf.setMaster(spark_config['master'])

    # Apply all Spark configurations from config file
    for key, value in spark_config['configs'].items():
        conf.set(key, value)

    # Create Spark session
    # getOrCreate() returns existing session if one exists, otherwise creates new
    spark = SparkSession.builder \\
        .config(conf=conf) \\
        .enableHiveSupport() \\
        .getOrCreate()

    # Set log level to WARN to reduce console noise
    # (Default is INFO which is very verbose)
    spark.sparkContext.setLogLevel("WARN")

    return spark


# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def get_database_url() -> str:
    """
    Build PostgreSQL connection URL from configuration.

    Reads database credentials from environment variables via database.yaml.

    Returns:
        str: SQLAlchemy-compatible connection URL

    Example:
        >>> url = get_database_url()
        >>> print(url)
        postgresql://postgres:postgres@localhost:5432/compressor_health
    """
    # Load database configuration
    db_config = load_config('database.yaml')
    db = db_config['database']

    # Build connection string
    # Format: postgresql://user:password@host:port/database
    url = f"postgresql://{db['user']}:{db['password']}@{db['host']}:{db['port']}/{db['database']}"

    return url


# ============================================================================
# FILE SYSTEM HELPERS
# ============================================================================

def get_data_path(layer: str) -> Path:
    """
    Get absolute path for a data layer directory.

    Args:
        layer (str): One of 'raw', 'bronze', 'silver', 'gold'

    Returns:
        Path: Absolute path to data directory

    Example:
        >>> raw_path = get_data_path('raw')
        >>> print(raw_path)
        /Users/david/altaviz/data/raw
    """
    # Load paths from config
    etl_config = load_config('etl_config.yaml')
    paths = etl_config['data_paths']

    # Map layer names to config keys
    layer_map = {
        'raw': 'raw_data',
        'bronze': 'processed_bronze',
        'silver': 'processed_silver',
        'gold': 'processed_gold',
    }

    if layer not in layer_map:
        raise ValueError(f"Unknown layer: {layer}. Valid options: {list(layer_map.keys())}")

    # Get relative path from config
    relative_path = paths[layer_map[layer]]

    # Convert to absolute path
    project_root = Path(__file__).parent.parent.parent
    absolute_path = project_root / relative_path

    # Create directory if it doesn't exist
    absolute_path.mkdir(parents=True, exist_ok=True)

    return absolute_path


# ============================================================================
# TIMING AND PERFORMANCE
# ============================================================================

class Timer:
    """
    Context manager for timing code execution.

    Usage:
        >>> with Timer("Loading data"):
        >>>     df = spark.read.parquet('data.parquet')
        [Timer] Loading data: 2.34 seconds
    """

    def __init__(self, name: str, logger=None):
        self.name = name
        self.logger = logger or setup_logging()
        self.start_time = None

    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info(f"[Timer] {self.name} started...")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = (datetime.now() - self.start_time).total_seconds()
        self.logger.info(f"[Timer] {self.name} completed in {elapsed:.2f} seconds")


# ============================================================================
# DATA QUALITY HELPERS
# ============================================================================

def log_dataframe_stats(df, name: str, logger=None):
    """
    Log statistics about a PySpark DataFrame.

    Useful for debugging and monitoring pipeline health.

    Args:
        df: PySpark DataFrame
        name (str): Description of DataFrame
        logger: Logger instance (optional)

    Example:
        >>> log_dataframe_stats(sensor_df, "Bronze Layer")
        [INFO] DataFrame: Bronze Layer
        [INFO]   Rows: 50,123
        [INFO]   Columns: 9
        [INFO]   Partitions: 8
    """
    if logger is None:
        logger = setup_logging()

    logger.info(f"DataFrame: {name}")
    logger.info(f"  Rows: {df.count():,}")
    logger.info(f"  Columns: {len(df.columns)}")
    logger.info(f"  Partitions: {df.rdd.getNumPartitions()}")


# ============================================================================
# MAIN - TESTING & EXAMPLES
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("COMPRESSOR HEALTH ETL - UTILITIES MODULE TEST")
    print("=" * 80)

    # Test logging
    logger = setup_logging()
    logger.info("Logger initialized successfully")

    # Test configuration loading
    print("\\nLoading configurations...")
    db_config = load_config('database.yaml')
    etl_config = load_config('etl_config.yaml')
    thresholds = load_config('thresholds.yaml')

    logger.info(f"Database host: {db_config['database']['host']}")
    logger.info(f"ETL app name: {etl_config['spark']['app_name']}")
    logger.info(f"Vibration threshold: {thresholds['sensor_thresholds']['vibration_mms']['warning_threshold']}")

    # Test Spark session
    print("\\nCreating Spark session...")
    with Timer("Spark session creation", logger):
        spark = create_spark_session()

    logger.info(f"Spark version: {spark.version}")
    logger.info(f"Spark master: {spark.sparkContext.master}")

    # Test database URL
    print("\\nDatabase connection...")
    db_url = get_database_url()
    logger.info(f"Database URL: {db_url.replace(db_config['database']['password'], '****')}")

    # Test data paths
    print("\\nData layer paths...")
    for layer in ['raw', 'bronze', 'silver', 'gold']:
        path = get_data_path(layer)
        logger.info(f"{layer.capitalize():8s} layer: {path}")

    # Stop Spark session
    spark.stop()
    logger.info("Spark session stopped")

    print("\\n" + "=" * 80)
    print("All utility functions tested successfully!")
    print("=" * 80)
