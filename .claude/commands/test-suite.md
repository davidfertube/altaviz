# Smart Test Runner

Run the appropriate test suite based on what was changed, or run all tests.

## Usage
```
/test-suite          # Run all tests (unit + eval + frontend)
/test-suite unit     # Python unit tests only
/test-suite frontend # Frontend Jest tests only
/test-suite agents   # Agent guardrail + state machine tests
/test-suite ml       # ML model tests (anomaly, temp drift, emissions, RUL)
/test-suite etl      # ETL integration tests (requires Spark)
/test-suite all      # Everything including integration and load tests
```

## Steps

1. Based on arguments, run the appropriate test commands:
   - No args or "all":
     ```bash
     pytest tests/unit/ -v --tb=short
     pytest tests/eval/ -v --tb=short
     cd frontend && npm test -- --watchAll=false
     ```
   - "unit": `pytest tests/unit/ -v --tb=short`
   - "frontend": `cd frontend && npm test -- --watchAll=false`
   - "agents": `pytest tests/unit/test_guardrails.py tests/unit/test_state_machine.py tests/unit/test_models.py tests/unit/test_id_generator.py -v`
   - "ml": `pytest tests/test_anomaly_detector.py tests/test_temp_drift_predictor.py tests/test_emissions_estimator.py tests/test_rul_predictor.py -v`
   - "etl": `pytest tests/integration/ -v` (requires Java 11+ for Spark)

2. Display results summary with pass/fail counts

## Notes
- Unit tests run without external dependencies
- Eval tests require OPENAI_API_KEY (skip gracefully without it)
- ETL integration tests require Java 11+ for PySpark
- Frontend tests require npm dependencies installed
