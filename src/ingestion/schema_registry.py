"""
Schema Registry — Avro Schema Validation for Event Hub Messages

Provides schema validation at the ingestion boundary to catch
malformed data before it enters the Bronze layer. In production,
this would use Azure Schema Registry (Event Hubs feature).

Schemas defined here must match:
1. IoT device payload format (Detechtion IIoT / SCADA)
2. Event Hub message body
3. Bronze layer Delta table schema (src/etl/schemas.py)

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: Avro Schema Validation at Ingestion Boundary
# WHY: The schema registry validates messages BEFORE they enter the Bronze
#      layer. This is the first line of defense against bad data:
#      - Catches missing required fields (compressor_id, timestamp)
#      - Catches wrong data types (string where number expected)
#      - Catches physically impossible values (negative pressure)
#      - Catches malformed compressor IDs (wrong format)
#      By validating at the boundary, we prevent corrupt data from ever
#      entering the lakehouse. Without this, bad data would flow through
#      Bronze (immutable!) and only be caught at the Silver cleaning step,
#      wasting storage and processing time.
# SCALING: Validation is O(1) per message (fixed number of field checks).
#          At ~16 messages/second, validation adds negligible latency.
# ALTERNATIVE: Could use Azure Schema Registry (managed Avro schema
#              service built into Event Hubs) for automatic validation.
#              This implementation is a lightweight local alternative
#              that works without Azure dependencies.
# ===========================================================================

# ===========================================================================
# PATTERN: Dead Letter Queue (DLQ) for Invalid Messages
# WHY: Invalid messages are NOT silently dropped — they are routed to a
#      dead letter structure with the original message + validation errors
#      + rejection timestamp. This serves three purposes:
#      1. Debugging: Engineers can inspect the dead letter queue to
#         understand WHY messages are being rejected.
#      2. Recovery: If the schema is updated (new required field added
#         prematurely), the DLQ allows re-processing after the fix.
#      3. Monitoring: The DLQ size is a health metric. A spike in
#         rejected messages indicates a producer-side issue (firmware
#         bug, misconfigured IoT device, or schema mismatch).
# ALTERNATIVE: Could use Azure Service Bus dead letter queues (built-in),
#              but that adds another Azure service dependency.
# ===========================================================================

import json
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Avro schema for sensor telemetry messages.
# This Avro schema definition serves as the "contract" between producers
# (IoT devices / fleet simulator) and consumers (Event Hub consumer /
# Bronze layer). In production with Azure Schema Registry, this would be
# registered and versioned. Schema evolution rules:
# - Adding a new optional field (with default) = BACKWARD COMPATIBLE
# - Removing a field = BREAKING (never do this)
# - Changing a field type = BREAKING (never do this)
# - Adding a required field = BREAKING (add as optional with default first)
SENSOR_TELEMETRY_SCHEMA = {
    "type": "record",
    "name": "SensorTelemetry",
    "namespace": "com.altaviz.telemetry",
    "doc": "Compressor sensor reading from IoT device",
    "fields": [
        {"name": "compressor_id", "type": "string", "doc": "Format: COMP-XXXX"},
        {"name": "timestamp", "type": "string", "doc": "ISO 8601 UTC timestamp"},
        {"name": "station_id", "type": ["null", "string"], "default": None},
        {"name": "basin", "type": ["null", "string"], "default": None},
        {"name": "vibration_mms", "type": ["null", "double"], "default": None},
        {"name": "discharge_temp_f", "type": ["null", "double"], "default": None},
        {"name": "suction_pressure_psi", "type": ["null", "double"], "default": None},
        {"name": "discharge_pressure_psi", "type": ["null", "double"], "default": None},
        {"name": "horsepower_consumption", "type": ["null", "double"], "default": None},
        {"name": "gas_flow_mcf", "type": ["null", "double"], "default": None},
        {"name": "operating_hours", "type": ["null", "double"], "default": None},
    ],
}

# Required fields that must be non-null
REQUIRED_FIELDS = {"compressor_id", "timestamp"}

# Valid ranges for sensor values (reject obvious garbage).
# These are a SECONDARY validation layer, distinct from the ABSOLUTE_BOUNDS
# in silver/cleanse.py. The schema registry bounds are intentionally
# identical or slightly wider because they serve the same purpose:
# catch physically impossible values. The difference is WHERE they run:
# - Schema registry: At ingestion, before Bronze (prevents bad data entry)
# - Silver cleanse: After Bronze, during ETL (catches data corruption)
# Having both layers provides defense-in-depth — if one layer is bypassed
# (e.g., batch import that skips schema registry), the other still catches
# the bad data.
VALID_RANGES = {
    "vibration_mms": (0.0, 50.0),
    "discharge_temp_f": (-50.0, 500.0),
    "suction_pressure_psi": (0.0, 500.0),
    "discharge_pressure_psi": (0.0, 3000.0),
    "horsepower_consumption": (0.0, 10000.0),
    "gas_flow_mcf": (0.0, 100000.0),
    "operating_hours": (0.0, 1000000.0),
}

# Compressor ID format validation.
# Format: COMP-XXXX where XXXX is a 4-digit zero-padded number.
# This regex rejects IDs like "PIPE-0001" (old prefix), "COMP-1" (missing
# zero-padding), or "COMP-00001" (5 digits). Strict format validation
# prevents join failures downstream — if a compressor_id does not match
# the format, it cannot be joined with metadata or historical data.
COMPRESSOR_ID_PATTERN = r'^COMP-\d{4}$'


def validate_message(message: Dict) -> Tuple[bool, List[str]]:
    """
    Validate a single telemetry message against the schema.

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    import re
    errors = []

    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in message or message[field] is None:
            errors.append(f"Missing required field: {field}")

    if errors:
        return False, errors

    # Validate compressor_id format
    comp_id = message.get('compressor_id', '')
    if not re.match(COMPRESSOR_ID_PATTERN, comp_id):
        errors.append(f"Invalid compressor_id format: {comp_id} (expected COMP-XXXX)")

    # Validate timestamp is parseable
    ts = message.get('timestamp', '')
    try:
        if isinstance(ts, str):
            datetime.fromisoformat(ts.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        errors.append(f"Invalid timestamp format: {ts}")

    # Validate sensor value ranges
    for field, (min_val, max_val) in VALID_RANGES.items():
        value = message.get(field)
        if value is not None:
            if not isinstance(value, (int, float)):
                errors.append(f"Non-numeric value for {field}: {value}")
            elif value < min_val or value > max_val:
                errors.append(f"Out-of-range value for {field}: {value} (valid: {min_val}-{max_val})")

    return len(errors) == 0, errors


def validate_batch(messages: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """
    Validate a batch of messages, separating valid from invalid.

    Returns:
        Tuple of (valid_messages, dead_letter_messages)
    """
    valid = []
    dead_letter = []

    for msg in messages:
        is_valid, errors = validate_message(msg)
        if is_valid:
            valid.append(msg)
        else:
            dead_letter.append({
                'original_message': msg,
                'validation_errors': errors,
                'rejected_at': datetime.utcnow().isoformat(),
            })

    if dead_letter:
        logger.warning(
            f"Schema validation: {len(valid)} valid, {len(dead_letter)} rejected "
            f"out of {len(messages)} total"
        )

    return valid, dead_letter


def get_schema_version() -> str:
    """Return the current schema version identifier."""
    return "v1.0.0"


def get_avro_schema_json() -> str:
    """Return the Avro schema as a JSON string (for Azure Schema Registry)."""
    return json.dumps(SENSOR_TELEMETRY_SCHEMA, indent=2)
