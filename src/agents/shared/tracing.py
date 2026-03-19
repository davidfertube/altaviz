# ===========================================================================
# PATTERN: Observability Layer with Graceful Degradation
# WHY: LLM-powered agents are expensive and non-deterministic. Tracing
#      captures: which LLM was called, what prompt was sent, how many
#      tokens were used, how long it took, and whether it succeeded.
#      Without tracing, debugging a flaky agent is nearly impossible.
#      However, tracing is OPTIONAL — the agents must work identically
#      whether Langfuse is configured or not. This is why every function
#      in this module degrades to a no-op if Langfuse is unavailable.
# SCALING: At Archrock scale (~100 workflows/day, 2 LLM calls each),
#          Langfuse ingests ~200 traces/day. The flush() call adds ~50ms
#          per trace but ensures data reaches Langfuse before the HTTP
#          response returns to the user.
# ALTERNATIVE: OpenTelemetry (OTEL) is the industry standard, and Pydantic
#              AI emits OTEL traces natively. Langfuse can consume OTEL
#              traces via its OTEL-compatible endpoint, so this module
#              could be replaced with a pure OTEL setup. We use Langfuse's
#              native SDK here because it provides a better LLM-specific
#              UI (prompt playground, token cost tracking, eval dashboards).
# ===========================================================================

"""
Langfuse Observability Integration for Altaviz Agents.

Provides LLM tracing, token counting, cost tracking, and latency
monitoring for all 4 AI agents. Uses OpenTelemetry-compatible
instrumentation that works with Pydantic AI's built-in tracing.

Setup:
    Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables.
    Optionally set LANGFUSE_HOST for self-hosted instances.

Usage:
    from .shared.tracing import observe, get_langfuse, flush_tracing

    @observe(name="my-operation")
    async def my_func():
        ...
"""

import os
import logging
from functools import wraps
from typing import Optional, Callable, Any

logger = logging.getLogger(__name__)

# ===========================================================================
# PATTERN: Singleton with Lazy Initialization
# WHY: The Langfuse client maintains a persistent HTTPS connection and a
#      background thread for batching traces. Creating multiple clients
#      wastes connections and can cause duplicate traces. We use module-level
#      variables (_langfuse_client, _tracing_enabled) as a simple singleton.
#      Lazy initialization means we don't create the client on import —
#      only when the first trace is requested. This prevents import-time
#      failures if LANGFUSE_PUBLIC_KEY is not set (common in dev/test).
# THREAD SAFETY: The Langfuse client is thread-safe internally (it uses
#                a background thread with a queue for batching). The
#                singleton initialization is not strictly thread-safe
#                (no lock), but in practice Python's GIL prevents races
#                during the simple assignment in _init_langfuse().
# ===========================================================================

# Langfuse client singleton
_langfuse_client = None
_tracing_enabled = False


def _init_langfuse():
    """Initialize Langfuse client if credentials are configured."""
    global _langfuse_client, _tracing_enabled

    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")

    # -----------------------------------------------------------------------
    # PATTERN: Graceful Degradation (no credentials = no tracing)
    # WHY: In dev/test, developers rarely have Langfuse credentials.
    #      Rather than raising an error or requiring a config flag,
    #      we simply disable tracing. The agents work identically
    #      either way — the @observe decorator becomes a passthrough.
    # -----------------------------------------------------------------------
    if not public_key or not secret_key:
        logger.info("Langfuse tracing disabled (no API keys configured)")
        _tracing_enabled = False
        return None

    try:
        from langfuse import Langfuse

        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        )
        _tracing_enabled = True
        logger.info("Langfuse tracing enabled")
        return _langfuse_client
    except ImportError:
        logger.warning("langfuse package not installed, tracing disabled")
        _tracing_enabled = False
        return None
    except Exception as e:
        logger.warning(f"Failed to initialize Langfuse: {e}")
        _tracing_enabled = False
        return None


def get_langfuse():
    """Get the Langfuse client singleton, initializing if needed."""
    global _langfuse_client
    if _langfuse_client is None:
        _init_langfuse()
    return _langfuse_client


def is_tracing_enabled() -> bool:
    """Check if tracing is enabled."""
    if _langfuse_client is None:
        _init_langfuse()
    return _tracing_enabled


# ===========================================================================
# PATTERN: Decorator Pattern for Tracing (@observe)
# WHY: The @observe decorator wraps any function (sync or async) with
#      Langfuse trace creation, without modifying the function's signature
#      or return value. This means you can add/remove tracing from any
#      function by adding/removing a single decorator line.
# HOW: The decorator detects whether the wrapped function is async
#      (using asyncio.iscoroutinefunction) and returns the appropriate
#      wrapper. Both wrappers follow the same pattern:
#      1. Get/create Langfuse client (no-op if not configured)
#      2. Create a trace with the given name
#      3. Run the wrapped function
#      4. Update the trace with output/error
#      5. Flush to ensure data reaches Langfuse
# FLUSH: We call client.flush() in the finally block of every trace.
#        This ensures trace data is sent to Langfuse before the HTTP
#        response returns. Without flush(), traces batch in memory and
#        could be lost if the process crashes. The ~50ms overhead is
#        acceptable for agent operations that take 2-5 seconds each.
# ===========================================================================
def observe(name: str, metadata: Optional[dict] = None):
    """Decorator to trace a function with Langfuse.

    Works as a no-op if Langfuse is not configured.

    Args:
        name: Trace name (e.g., "investigation-agent", "diagnose")
        metadata: Optional metadata dict to attach to the trace
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            client = get_langfuse()
            if not client or not _tracing_enabled:
                return await func(*args, **kwargs)

            trace = client.trace(
                name=name,
                metadata=metadata or {},
            )

            try:
                result = await func(*args, **kwargs)

                trace.update(
                    output=str(result)[:1000] if result else None,
                    metadata={**(metadata or {}), "status": "success"},
                )
                return result
            except Exception as e:
                trace.update(
                    metadata={**(metadata or {}), "status": "error", "error": str(e)},
                )
                raise
            finally:
                # -----------------------------------------------------------
                # Flush on every trace completion. The try/except swallows
                # network errors — we never want a Langfuse outage to break
                # the agent's response to the user.
                # -----------------------------------------------------------
                try:
                    client.flush()
                except Exception:
                    pass

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            client = get_langfuse()
            if not client or not _tracing_enabled:
                return func(*args, **kwargs)

            trace = client.trace(
                name=name,
                metadata=metadata or {},
            )

            try:
                result = func(*args, **kwargs)
                trace.update(
                    output=str(result)[:1000] if result else None,
                    metadata={**(metadata or {}), "status": "success"},
                )
                return result
            except Exception as e:
                trace.update(
                    metadata={**(metadata or {}), "status": "error", "error": str(e)},
                )
                raise
            finally:
                try:
                    client.flush()
                except Exception:
                    pass

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def create_trace(name: str, **kwargs):
    """Create a manual trace for custom instrumentation.

    Returns a trace object or None if tracing is disabled.
    """
    client = get_langfuse()
    if not client or not _tracing_enabled:
        return None
    return client.trace(name=name, **kwargs)


def flush_tracing():
    """Flush any pending traces to Langfuse."""
    client = get_langfuse()
    if client:
        try:
            client.flush()
        except Exception as e:
            logger.warning(f"Failed to flush Langfuse traces: {e}")


def shutdown_tracing():
    """Shutdown the Langfuse client gracefully."""
    global _langfuse_client, _tracing_enabled
    if _langfuse_client:
        try:
            _langfuse_client.flush()
            _langfuse_client.shutdown()
        except Exception:
            pass
    _langfuse_client = None
    _tracing_enabled = False
