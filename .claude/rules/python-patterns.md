---
paths:
  - "src/**/*.py"
  - "tests/**/*.py"
---
# Python Patterns for Altaviz

## Critical Rules (from CLAUDE.md)
- NEVER use `inferSchema`; always use explicit `StructType` schemas from `src/etl/schemas.py`
- NEVER chain `.withColumn()` calls; use a single `.select()` with all new columns
- NEVER hardcode credentials; use environment variables or Azure Key Vault
- NEVER use doubled backslashes `\\` in PySpark code (SyntaxError bug)

## Design Patterns Used
- **Factory Pattern**: `knowledge_base._get_openai_client()` — switches Azure/OpenAI based on env
- **Strategy Pattern**: `search_backend.get_search_backend()` — pgvector or Azure AI Search
- **Singleton Pattern**: `tracing._langfuse_client` — one Langfuse client per process
- **State Machine Pattern**: `work_order_state_machine.py` — 9-state lifecycle with audit trail
- **Repository Pattern**: `shared/db_tools.py` — centralized data access for all agents
- **Observer/Decorator Pattern**: `@observe()` for Langfuse tracing
- **Template Method Pattern**: `pipeline.py` — Bronze → Silver → Gold fixed sequence
- **Adapter Pattern**: `graph/nodes.py` — wraps Pydantic AI agents for LangGraph

## PySpark Patterns
- Always broadcast small dimension tables: `large_df.join(broadcast(small_df), "compressor_id")`
- Single `.select()` with all transformations, never chained `.withColumn()`
- Explicit schema: `spark.read.schema(SENSOR_SCHEMA).parquet(path)`
- Partition Gold by `date` + `region`; Z-order by `compressor_id`
- `date_format()` returns StringType — must `.cast("timestamp")` before writes

## Type Hints
- All public functions must have type annotations
- Use `Optional[str]` for Python 3.10 compatibility
- Use Pydantic models for structured outputs, dataclasses for DTOs

## Error Handling
- Agent tools return `{"error": "..."}` JSON on failure (never raise in tools)
- API endpoints raise `HTTPException` with appropriate status codes
- ETL pipeline stages are idempotent (safe to re-run on failure)
- Use structured logging: `logger.error(f"Context: {details}")`, never print()
