"""
Sequential ID generators for the Altaviz agentic system.

Generates human-readable IDs for work orders, investigations,
optimization recommendations, and fleet snapshots.

Format: PREFIX-YYYY-NNNNN (e.g., WO-2026-00001)
"""

# ===========================================================================
# PATTERN: Sequential Human-Readable IDs
# WHY: Work orders, investigations, and recommendations need IDs that are:
#   1. Human-readable: "WO-2026-00042" is meaningful to a field technician
#      (vs. "a3f7c8d2-1b4e-..." which is opaque)
#   2. Sortable: Lexicographic sorting preserves chronological order
#      (WO-2026-00001 < WO-2026-00002)
#   3. Year-partitioned: IDs reset each year, making it easy to query
#      "all 2026 work orders" with a prefix filter
#   4. Collision-free: Database-backed sequence lookup ensures no duplicates
#      even with concurrent creation
#
# PREFIX MAPPING:
#   WO   = Work Order (maintenance task)
#   INV  = Investigation (root cause analysis)
#   OPT  = Optimization recommendation (fleet-level suggestion)
#   SNAP = Fleet snapshot (periodic health capture)
#
# ALTERNATIVE: UUIDs are simpler (no DB lookup) but unreadable.
#   PostgreSQL SEQUENCE would be more performant but doesn't support
#   the year-partitioned prefix format. Auto-increment integers lose
#   the prefix context ("what is entity #42?" vs. "WO-2026-00042 is a work order").
# ===========================================================================

from datetime import datetime

from .db_tools import query_db


def _get_next_sequence(table: str, id_column: str, prefix: str) -> int:
    """Get the next sequence number for a given table and year prefix.

    Queries the database for the highest existing ID with the same prefix
    and year, then returns that number + 1. If no IDs exist for the current
    year, starts at 1.

    CONCURRENCY NOTE: This is NOT safe under high concurrent writes.
    Two simultaneous calls could get the same sequence number. For production
    at scale, use a PostgreSQL SEQUENCE or an advisory lock:
      SELECT pg_advisory_xact_lock(hashtext('WO-2026'));
    For our current throughput (~10 WO/hour max), this race condition
    is extremely unlikely and the guardrail rate limit prevents rapid creation.
    """
    year = datetime.utcnow().strftime('%Y')
    pattern = f"{prefix}-{year}-%"

    rows = query_db(
        f"""SELECT {id_column} FROM {table}
            WHERE {id_column} LIKE %s
            ORDER BY {id_column} DESC
            LIMIT 1""",
        [pattern]
    )

    if not rows:
        return 1  # First entity of this type for the year

    last_id = rows[0][id_column]
    # Extract sequence number from format PREFIX-YYYY-NNNNN
    try:
        seq = int(last_id.split('-')[-1])
        return seq + 1
    except (ValueError, IndexError):
        return 1  # Fallback if ID format is corrupted


def generate_work_order_id() -> str:
    """Generate the next work order ID (WO-2026-00001)."""
    year = datetime.utcnow().strftime('%Y')
    seq = _get_next_sequence('work_orders', 'work_order_id', 'WO')
    return f"WO-{year}-{seq:05d}"


def generate_investigation_id() -> str:
    """Generate the next investigation ID (INV-2026-00001)."""
    year = datetime.utcnow().strftime('%Y')
    seq = _get_next_sequence('investigation_reports', 'investigation_id', 'INV')
    return f"INV-{year}-{seq:05d}"


def generate_recommendation_id() -> str:
    """Generate the next optimization recommendation ID (OPT-2026-00001)."""
    year = datetime.utcnow().strftime('%Y')
    seq = _get_next_sequence('optimization_recommendations', 'recommendation_id', 'OPT')
    return f"OPT-{year}-{seq:05d}"


def generate_snapshot_id(snapshot_type: str = 'daily') -> str:
    """Generate a fleet snapshot ID (SNAP-2026-02-26-daily).

    Unlike other IDs, snapshots use date-based IDs (not sequential) because
    there should be exactly one snapshot per type per day. The ON CONFLICT
    clause in fleet_scanner.create_fleet_snapshot() uses this ID for upsert,
    so re-running the daily snapshot updates the existing record rather than
    creating a duplicate.
    """
    date_str = datetime.utcnow().strftime('%Y-%m-%d')
    return f"SNAP-{date_str}-{snapshot_type}"
