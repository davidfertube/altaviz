# Evaluate Agent Quality

Run the DeepEval evaluation suite to measure agent quality metrics.

## Usage
```
/eval-agents              # Run all evaluation tests
/eval-agents investigation # Run investigation quality tests only
/eval-agents rag          # Run RAG quality tests only
/eval-agents work-order   # Run work order quality tests only
```

## Steps

1. Check if deepeval is installed: `python3 -c "import deepeval; print(deepeval.__version__)"`
2. If not installed: `pip install deepeval`
3. Based on arguments:
   - No args: `pytest tests/eval/ -v --tb=short`
   - "investigation": `pytest tests/eval/test_investigation_quality.py -v --tb=short`
   - "rag": `pytest tests/eval/test_rag_quality.py -v --tb=short`
   - "work-order": `pytest tests/eval/test_work_order_quality.py -v --tb=short`
4. Display results summary:
   - Total tests, passed, failed, skipped
   - Per-metric scores (faithfulness, hallucination, context relevancy)
   - Recommendations for improving failed metrics

## Quality Thresholds
| Metric | Threshold | What It Tests |
|--------|-----------|--------------|
| Faithfulness | >= 0.7 | Root cause grounded in sensor data |
| Hallucination | >= 0.8 | No fabricated information |
| Context Relevancy | >= 0.6 | Retrieved docs are relevant |
| Answer Relevancy | >= 0.7 | Response addresses the query |

## Notes
- Requires OPENAI_API_KEY for LLM-as-judge evaluation
- Tests skip gracefully if deepeval is not installed
- Run after modifying agent system prompts or tools to catch regressions
