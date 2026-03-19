# Runbook: Agent Debugging

## Symptoms
- Agent returns low confidence (<0.6) consistently
- Investigation root cause doesn't match technician feedback
- Work orders have incorrect priority or cost estimates
- Langfuse traces show excessive tool calls or timeouts

## Diagnosis Steps

### 1. Check Langfuse traces
```bash
# If using Langfuse Cloud, open the dashboard:
echo "Open https://cloud.langfuse.com → Traces"

# Filter by:
# - Agent type: investigation, work_order, optimization, diagnostics
# - Status: error, or latency > 30s
# - Compressor ID if specific unit is failing
```

### 2. Run DeepEval quality checks
```bash
# Run all evaluation tests
pytest tests/eval/ -v --tb=short

# Run specific agent evaluation
pytest tests/eval/test_investigation_quality.py -v   # Investigation quality
pytest tests/eval/test_work_order_quality.py -v      # Work order quality
pytest tests/eval/test_rag_quality.py -v             # RAG retrieval quality
```

### 3. Test specific agent locally
```bash
# Start agent API
uvicorn src.agents.api:app --port 8001

# Run diagnostics for a specific compressor
curl -X POST http://localhost:8001/diagnose \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003"}'

# Run investigation
curl -X POST http://localhost:8001/investigations/start \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003", "trigger_type": "manual"}'

# Run closed-loop workflow
curl -X POST http://localhost:8001/workflows/closed-loop \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003", "trigger": "alert"}'
```

### 4. Check the knowledge base
```bash
# Verify knowledge base has relevant documents
curl http://localhost:8001/knowledge-base?doc_type=maintenance_manual

# Test a search query
python3 -c "
from src.agents.knowledge_base import search_knowledge_base
results = search_knowledge_base('bearing wear vibration', '<org-id>')
print(results)
"
```

### 5. Check LangGraph workflow state
```bash
# If a closed-loop workflow is stuck, check which node it stopped at
python3 -c "
from src.agents.graph.workflow import _get_graph
graph = _get_graph()
# List the graph structure
print('Nodes:', list(graph.nodes.keys()))
print('Entry:', graph.builder._entry_point)
"
```

## Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Low confidence on all investigations | Knowledge base empty | Seed with `infrastructure/sql/seed_data.sql` |
| Agent calls wrong tools | System prompt drift | Compare current prompt to original in git |
| Work order cost too high | Guardrails not triggering | Check `shared/guardrails.py` thresholds |
| RAG returns irrelevant docs | Embedding model mismatch | Verify `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` matches indexed embeddings |
| LangGraph workflow hangs | Approval node waiting for HITL | Check `approval_status` in state, auto-approve for dev |
| Token count shows 0 | Langfuse not configured | Set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` |

## Improving Agent Quality

1. **Add learned lessons**: When technicians correct a diagnosis, it creates a knowledge base entry via the feedback loop
2. **Tune system prompts**: Adjust thresholds, add new failure mode descriptions
3. **Add test cases**: Create new DeepEval tests for the specific failure pattern
4. **Check Langfuse**: Look at tool call sequences — are tools being called in the right order?
5. **Compare to baseline**: Run `pytest tests/eval/ -v 2>&1 | diff - docs/eval-baseline.txt`
