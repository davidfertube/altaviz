# Pre-Deployment Validation

Run all validation checks before deploying to Azure.

## Usage
```
/deploy-check         # Full validation
/deploy-check infra   # Terraform validation only
/deploy-check build   # Frontend build check only
```

## Steps

1. **Python syntax check**
   ```bash
   python3 -m py_compile src/agents/api.py
   python3 -m py_compile src/agents/graph/workflow.py
   python3 -m py_compile src/ml/serving/batch_predictor.py
   ```

2. **Import verification**
   ```bash
   python3 -c "from src.agents.shared.tracing import observe; print('Langfuse: OK')"
   python3 -c "from src.agents.search_backend import get_search_backend; print('Search backend: OK')"
   python3 -c "from src.agents.graph.workflow import build_closed_loop_graph; print('LangGraph: OK')"
   ```

3. **Terraform validation** (if "infra" or full check)
   ```bash
   cd infrastructure/terraform && terraform fmt -check -recursive
   cd infrastructure/terraform && terraform validate
   ```

4. **Frontend build** (if "build" or full check)
   ```bash
   cd frontend && npm run build
   ```

5. **Unit tests**
   ```bash
   pytest tests/unit/ -v --tb=short
   ```

6. **Security check** — verify no secrets in code
   ```bash
   grep -r "sk-" src/ --include="*.py" -l || echo "No API keys found in source"
   grep -r "password" src/ --include="*.py" -l || echo "No passwords found in source"
   ```

7. Display pass/fail summary for each check

## Notes
- Run before every PR and deployment
- Terraform validation requires `terraform init` first
- Frontend build catches TypeScript errors and missing imports
