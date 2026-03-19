"""
Agent session persistence for the Altaviz agentic system.

Manages the lifecycle of agent sessions: creation, message appending,
status updates, and completion tracking. Used by all 3 agents.
"""

# ===========================================================================
# PATTERN: Session Lifecycle (Create -> Append -> Complete)
# WHY: Every agent invocation is wrapped in a "session" that tracks:
#   - WHO triggered it (user_id, organization_id)
#   - WHAT was done (agent_type, compressor_id, trigger_type)
#   - HOW it went (duration, tokens, status, result)
#   - WHAT was said (messages JSONB array — full conversation history)
# This provides: (1) audit trail for compliance, (2) cost accounting per
# org/user, (3) debugging data when an agent produces unexpected output,
# (4) analytics for agent performance optimization.
# SCALING: At fleet scale with autonomous scans running hourly, sessions
# accumulate rapidly. Partition the agent_sessions table by created_at
# month and set a retention policy (e.g., 90 days for messages, forever
# for metadata).
# ===========================================================================

import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from .db_tools import query_db, execute_db, insert_returning, _serialize_value

logger = logging.getLogger(__name__)


def create_session(
    organization_id: str,
    agent_type: str,
    user_id: Optional[str] = None,
    compressor_id: Optional[str] = None,
    trigger_type: Optional[str] = None,
    trigger_id: Optional[str] = None,
) -> str:
    """Create a new agent session and return the session_id (UUID)."""
    # ===========================================================================
    # WHY UUID for session_id:
    # UUIDs are globally unique across all agents, orgs, and deployments without
    # requiring coordination (no distributed lock, no sequence table). This is
    # critical when multiple API replicas create sessions concurrently.
    # Sequential IDs (like WO-2026-00001) are used for human-facing entities;
    # UUIDs are used for internal tracking entities.
    # ===========================================================================
    session_id = str(uuid.uuid4())

    execute_db(
        """INSERT INTO agent_sessions
           (session_id, organization_id, user_id, agent_type,
            compressor_id, trigger_type, trigger_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        [session_id, organization_id, user_id, agent_type,
         compressor_id, trigger_type, trigger_id]
    )

    logger.info(f"Created {agent_type} session {session_id} for org {organization_id}")
    return session_id


# ===========================================================================
# WHY JSONB for messages:
# The messages column stores the full conversation history as a JSONB array.
# Benefits over a normalized messages table:
#   1. Flexible schema: different agents have different message shapes
#      (e.g., investigation has evidence_chain, work order has parts_list).
#      JSONB handles this without schema migrations.
#   2. Queryable: PostgreSQL JSONB supports operators like @>, ?|, and
#      jsonb_array_elements() for analytics queries.
#   3. Atomic append: messages || new_message::jsonb is atomic (no race
#      conditions from concurrent tool calls).
# TRADEOFF: JSONB is slower than relational queries for message-level
#   filtering. If you need "find all sessions where tool X was called",
#   extract tool_calls into a separate indexed table.
# ===========================================================================
def append_message(session_id: str, role: str, content: str,
                   tool_calls: Optional[list] = None) -> None:
    """Append a message to the session's conversation history."""
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if tool_calls:
        message["tool_calls"] = tool_calls

    # Atomic JSONB array append: messages || new_message::jsonb
    # This is safe for concurrent access (no lost updates).
    execute_db(
        """UPDATE agent_sessions
           SET messages = messages || %s::jsonb,
               total_tool_calls = total_tool_calls + %s
           WHERE session_id = %s""",
        [json.dumps([message]), len(tool_calls or []), session_id]
    )


def update_session_status(session_id: str, status: str) -> None:
    """Update the session status."""
    execute_db(
        "UPDATE agent_sessions SET status = %s WHERE session_id = %s",
        [status, session_id]
    )


def complete_session(
    session_id: str,
    result_type: Optional[str] = None,
    result_id: Optional[str] = None,
    total_tokens: int = 0,  # Currently always 0 — see token counting gap note below
    duration_seconds: float = 0,
    status: str = 'completed',
) -> None:
    """Mark a session as completed with results and metrics.

    Token counting gap: total_tokens is currently always 0 because Pydantic AI
    does not expose token usage from the underlying LLM call. To enable token
    tracking, integrate Langfuse (already configured in shared/tracing.py) which
    captures token counts from the LLM response headers. The Langfuse trace_id
    can be linked to the session_id for cost attribution.
    """
    execute_db(
        """UPDATE agent_sessions
           SET status = %s,
               result_type = %s,
               result_id = %s,
               total_tokens = %s,
               duration_seconds = %s,
               completed_at = NOW()
           WHERE session_id = %s""",
        [status, result_type, result_id, total_tokens, duration_seconds, session_id]
    )
    logger.info(f"Session {session_id} completed: {status}, result={result_type}/{result_id}")


def get_session(session_id: str) -> Optional[dict]:
    """Fetch a session by ID."""
    rows = query_db(
        """SELECT session_id, organization_id, user_id, agent_type,
                  compressor_id, trigger_type, trigger_id,
                  messages, context, result_type, result_id,
                  status, total_tokens, total_tool_calls,
                  duration_seconds, created_at, completed_at
           FROM agent_sessions WHERE session_id = %s""",
        [session_id]
    )
    if not rows:
        return None
    row = rows[0]
    for k, v in row.items():
        row[k] = _serialize_value(v)
    return row


def list_sessions(
    organization_id: str,
    agent_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """List recent sessions for an organization with optional filters."""
    conditions = ["organization_id = %s"]
    params = [organization_id]

    if agent_type:
        conditions.append("agent_type = %s")
        params.append(agent_type)
    if status:
        conditions.append("status = %s")
        params.append(status)

    params.append(limit)
    where = " AND ".join(conditions)

    rows = query_db(
        f"""SELECT session_id, agent_type, compressor_id, status,
                   result_type, result_id, total_tokens, duration_seconds,
                   created_at, completed_at
            FROM agent_sessions
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s""",
        params
    )
    from .db_tools import _serialize_rows
    return _serialize_rows(rows)
