"""
Sequential ID generators for the Altaviz agentic system.

Generates human-readable IDs for work orders, investigations,
optimization recommendations, and fleet snapshots.

Format: PREFIX-YYYY-NNNNN (e.g., WO-2026-00001)
"""

from datetime import datetime

from .db_tools import query_db


def _get_next_sequence(table: str, id_column: str, prefix: str) -> int:
    """Get the next sequence number for a given table and year prefix."""
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
        return 1

    last_id = rows[0][id_column]
    # Extract sequence number from format PREFIX-YYYY-NNNNN
    try:
        seq = int(last_id.split('-')[-1])
        return seq + 1
    except (ValueError, IndexError):
        return 1


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
    """Generate a fleet snapshot ID (SNAP-2026-02-26-daily)."""
    date_str = datetime.utcnow().strftime('%Y-%m-%d')
    return f"SNAP-{date_str}-{snapshot_type}"
