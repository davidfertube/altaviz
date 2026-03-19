---
paths:
  - "tests/**/*.py"
  - "frontend/src/__tests__/**/*.ts"
---
# Testing Rules for Altaviz

## Python Test Structure
| Directory | What | Dependencies | Speed |
|-----------|------|-------------|-------|
| `tests/unit/` | Guardrails, state machine, models, IDs | None | Fast (<5s) |
| `tests/eval/` | Agent quality (DeepEval metrics) | OpenAI API | Medium (~30s) |
| `tests/integration/` | OneLake, Bronze/Silver/Gold pipeline | Java 11+ (Spark) | Slow (~60s) |
| `tests/load/` | Fleet simulator at 4,700 scale | None | Slow (~120s) |

## Frontend Test Structure
- `frontend/src/__tests__/lib/` — Unit tests for validation, plans, crypto
- `frontend/src/__tests__/api/` — API route tests
- Coverage threshold: 60% (configured in Jest)

## Commands
```bash
pytest tests/unit/ -v                    # Always run before committing
pytest tests/eval/ -v                    # Run after agent changes
pytest tests/integration/ -v             # Run after ETL changes (needs Spark)
cd frontend && npm test                  # Run after frontend changes
```

## Rules
- Unit tests MUST pass before any commit to agent or ML code
- DeepEval tests skip gracefully if deepeval package not installed
- Never mock the database in integration tests
- Use `pytest.mark.parametrize` for failure mode variations
- Agent eval thresholds: faithfulness >= 0.7, hallucination >= 0.8, context >= 0.6
