# Altaviz → Azure Integration: Next Steps

> Checklist for integrating Altaviz with Archrock's Azure environment.
> Each step includes CLI commands, cost estimates, and verification.
> Target: Complete within first 90 days at Archrock.

---

## Phase 1: Azure Foundation (Week 1-2)

### 1.1 Azure Account Setup
- [ ] Create Azure account or get Archrock tenant access
  ```bash
  # Install Azure CLI
  brew install azure-cli

  # Login to Azure
  az login

  # Verify subscription
  az account show --query "{name:name, id:id, tenantId:tenantId}"

  # Set default subscription
  az account set --subscription "<subscription-id>"
  ```
- [ ] Create resource group for Altaviz dev environment
  ```bash
  az group create \
    --name altaviz-dev-rg \
    --location southcentralus \
    --tags project=altaviz environment=dev team=data-engineering
  ```
- [ ] Request Archrock Azure DevOps access from Kunal/IT (Day 1 priority)
- [ ] Request VPN/network access from Larry Kech (IT Director)
- **Cost:** $0

### 1.2 Azure OpenAI Service
- [ ] Create Azure OpenAI resource
  ```bash
  az cognitiveservices account create \
    --name altaviz-openai \
    --resource-group altaviz-dev-rg \
    --kind OpenAI \
    --sku S0 \
    --location eastus
  ```
- [ ] Deploy gpt-4o-mini model
  ```bash
  az cognitiveservices account deployment create \
    --name altaviz-openai \
    --resource-group altaviz-dev-rg \
    --deployment-name gpt-4o-mini \
    --model-name gpt-4o-mini \
    --model-version "2024-07-18" \
    --model-format OpenAI \
    --sku-capacity 10 \
    --sku-name Standard
  ```
- [ ] Deploy text-embedding-3-small model
  ```bash
  az cognitiveservices account deployment create \
    --name altaviz-openai \
    --resource-group altaviz-dev-rg \
    --deployment-name text-embedding-3-small \
    --model-name text-embedding-3-small \
    --model-version "1" \
    --model-format OpenAI \
    --sku-capacity 10 \
    --sku-name Standard
  ```
- [ ] Get endpoint and key
  ```bash
  # Endpoint
  az cognitiveservices account show \
    --name altaviz-openai \
    --resource-group altaviz-dev-rg \
    --query "properties.endpoint" -o tsv

  # API Key
  az cognitiveservices account keys list \
    --name altaviz-openai \
    --resource-group altaviz-dev-rg \
    --query "key1" -o tsv
  ```
- [ ] Update `.env` with Azure OpenAI credentials
  ```bash
  AZURE_OPENAI_ENDPOINT=https://altaviz-openai.openai.azure.com/
  AZURE_OPENAI_API_KEY=<key>
  AZURE_OPENAI_API_VERSION=2024-08-01-preview
  AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
  DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini
  ```
- [ ] Verify agent connectivity
  ```bash
  python3 -m src.agents.run_diagnosis COMP-0003
  ```
- **Cost:** ~$5-10/month (PAYG, dev usage)

### 1.3 Azure AI Search
- [ ] Create search service (Free tier)
  ```bash
  az search service create \
    --name altaviz-search \
    --resource-group altaviz-dev-rg \
    --sku free \
    --location eastus
  ```
- [ ] Get admin key
  ```bash
  az search admin-key show \
    --service-name altaviz-search \
    --resource-group altaviz-dev-rg \
    --query "primaryKey" -o tsv
  ```
- [ ] Update `.env`
  ```bash
  AZURE_SEARCH_ENDPOINT=https://altaviz-search.search.windows.net
  AZURE_SEARCH_API_KEY=<admin-key>
  AZURE_SEARCH_INDEX=altaviz-knowledge-base
  SEARCH_BACKEND=azure
  ```
- [ ] Migrate knowledge base from pgvector
  ```bash
  python3 scripts/migrate_pgvector_to_search.py
  ```
- [ ] Verify hybrid search works
  ```bash
  python3 -c "
  from src.agents.search_backend import get_search_backend
  backend = get_search_backend()
  results = backend.search('bearing wear vibration', 'your-org-id')
  print(f'Found {len(results)} results')
  for r in results:
      print(f'  {r[\"title\"]} (score: {r[\"relevance_score\"]})')
  "
  ```
- **Cost:** $0 (Free tier: 50 MB, 3 indexes)

---

## Phase 2: Observability & Evaluation (Week 3-4)

### 2.1 Langfuse Setup
- [ ] Sign up at cloud.langfuse.com (free tier: 50K observations/month)
- [ ] Create project "altaviz"
- [ ] Get API keys from Settings → API Keys
- [ ] Update `.env`
  ```bash
  LANGFUSE_PUBLIC_KEY=pk-lf-...
  LANGFUSE_SECRET_KEY=sk-lf-...
  LANGFUSE_HOST=https://cloud.langfuse.com
  ```
- [ ] Start agent API and verify traces
  ```bash
  uvicorn src.agents.api:app --port 8001 &
  curl -X POST http://localhost:8001/diagnose \
    -H "Content-Type: application/json" \
    -d '{"compressor_id": "COMP-0003"}'

  # Check Langfuse dashboard for trace
  echo "Open https://cloud.langfuse.com → Traces"
  ```
- **Cost:** $0 (Free tier)

### 2.2 DeepEval Agent Evaluation
- [ ] Install DeepEval
  ```bash
  pip install deepeval
  ```
- [ ] Run evaluation suite
  ```bash
  pytest tests/eval/ -v --tb=short
  ```
- [ ] Set quality baselines (record initial scores)
  ```bash
  pytest tests/eval/ -v 2>&1 | tee docs/eval-baseline.txt
  ```
- [ ] Add eval to CI pipeline
  ```bash
  # Already configured in .github/workflows/ci.yml
  # Verify it runs on PR
  ```
- **Cost:** $0 (open source)

### 2.3 LangGraph Closed-Loop Workflow
- [ ] Install LangGraph
  ```bash
  pip install langgraph langgraph-checkpoint-postgres
  ```
- [ ] Test closed-loop workflow
  ```bash
  uvicorn src.agents.api:app --port 8001 &
  curl -X POST http://localhost:8001/workflows/closed-loop \
    -H "Content-Type: application/json" \
    -d '{"compressor_id": "COMP-0003", "trigger": "alert"}'
  ```
- [ ] Verify workflow produces investigation + work order + knowledge update
- **Cost:** $0 (open source)

---

## Phase 3: ML Platform (Week 5-8)

### 3.1 Azure ML Workspace
- [ ] Create workspace
  ```bash
  az ml workspace create \
    --name altaviz-ml \
    --resource-group altaviz-dev-rg \
    --location eastus
  ```
- [ ] Get tracking URI
  ```bash
  az ml workspace show \
    --name altaviz-ml \
    --resource-group altaviz-dev-rg \
    --query "mlFlowTrackingUri" -o tsv
  ```
- [ ] Update `.env`
  ```bash
  MLFLOW_TRACKING_URI=<tracking-uri>
  AZURE_ML_WORKSPACE_NAME=altaviz-ml
  AZURE_ML_RESOURCE_GROUP=altaviz-dev-rg
  AZURE_ML_SUBSCRIPTION_ID=<subscription-id>
  ```
- [ ] Register all 4 models
  ```bash
  python3 -c "
  from src.ml.serving.model_registry import register_model
  for model in ['anomaly_detector', 'temp_drift', 'emissions', 'rul']:
      register_model(model, stage='Staging')
      print(f'Registered {model}')
  "
  ```
- [ ] Promote to Production after validation
- **Cost:** $0 (Free tier: 10 GB storage)

### 3.2 Azure Functions (Serverless Scoring)
- [ ] Install Azure Functions Core Tools
  ```bash
  brew install azure-functions-core-tools@4
  ```
- [ ] Test locally
  ```bash
  cd functions && func start
  # In another terminal:
  curl http://localhost:7071/api/anomaly_scorer \
    -H "Content-Type: application/json" \
    -d '{"vibration_mms": 7.2, "discharge_temp_f": 195, "discharge_pressure_psi": 1050}'
  ```
- [ ] Deploy to Azure
  ```bash
  az functionapp create \
    --name altaviz-functions \
    --resource-group altaviz-dev-rg \
    --consumption-plan-location eastus \
    --runtime python \
    --runtime-version 3.11 \
    --functions-version 4 \
    --storage-account altavizstorage \
    --os-type Linux

  func azure functionapp publish altaviz-functions
  ```
- **Cost:** $0 (Consumption plan: 1M executions free/month)

---

## Phase 4: Governance & DevOps (Week 9-12)

### 4.1 Microsoft Purview
- [ ] Create Purview account
  ```bash
  az purview account create \
    --name altaviz-purview \
    --resource-group altaviz-dev-rg \
    --location eastus
  ```
- [ ] Register data sources
  ```bash
  python3 scripts/register_purview_sources.py
  ```
- [ ] Scan OneLake lakehouses for data catalog
- **Cost:** ~$2-5/month (PAYG per scan)

### 4.2 Azure DevOps Migration
- [ ] Create Azure DevOps organization at dev.azure.com
- [ ] Create project "altaviz"
- [ ] Import repo from GitHub
  ```bash
  # From Azure DevOps UI:
  # Repos → Import → GitHub URL
  ```
- [ ] Set up CI/CD pipeline from `azure-pipelines.yml`
  ```bash
  # azure-pipelines.yml is already in the repo
  # Just create a new pipeline pointing to it
  ```
- [ ] Configure branch policies (require PR review, CI pass)
- **Cost:** $0 (Free tier: 5 users, 1 parallel job)

### 4.3 Power BI Dashboard
- [ ] Install Power BI Desktop
- [ ] Connect to OneLake Gold layer (DirectLake mode)
  ```
  Get Data → Azure → Azure Data Lake Storage Gen2
  URL: abfss://altaviz-production@onelake.dfs.fabric.microsoft.com/lh_gold_curated/
  ```
- [ ] Build fleet health report (see `docs/powerbi/fleet_health_report.md`)
- [ ] Create DAX measures (see `docs/powerbi/dax_measures.md`)
- [ ] Publish to Fabric workspace
- **Cost:** $0 (included with Fabric license)

---

## Phase 5: Production Hardening (Month 4-6)

### 5.1 Infrastructure as Code
- [ ] Initialize Terraform backend
  ```bash
  cd infrastructure/terraform
  terraform init \
    -backend-config=envs/staging.tfbackend
  ```
- [ ] Plan and validate
  ```bash
  terraform plan -var-file=envs/staging.tfvars -out=plan.tfplan
  ```
- [ ] Apply (staging first, then production)
  ```bash
  terraform apply plan.tfplan
  ```

### 5.2 Monitoring & Alerting
- [ ] Configure Azure Monitor alerts for pipeline failures
- [ ] Set up Teams webhook for critical alerts
- [ ] Create Langfuse dashboard for agent performance
- [ ] Set up cost alerts at $50/month threshold
  ```bash
  az consumption budget create \
    --budget-name altaviz-dev-budget \
    --resource-group altaviz-dev-rg \
    --amount 50 \
    --time-grain Monthly \
    --category Cost
  ```

### 5.3 Security Hardening
- [ ] Enable Azure Key Vault for all secrets
- [ ] Configure Managed Identity for service-to-service auth
- [ ] Enable Microsoft Defender for Cloud
- [ ] Run security scan on container images
  ```bash
  az acr run \
    --registry altavizacr \
    --cmd "docker scan altaviz-frontend:latest" /dev/null
  ```

### 5.4 Performance Optimization
- [ ] Enable Azure Synapse serverless SQL for ad-hoc queries
- [ ] Configure auto-scaling for Container Apps
- [ ] Optimize Spark configurations for Fabric notebooks
- [ ] Set up Azure Data Explorer for real-time telemetry analytics

---

## Cost Summary

| Phase | Service | Monthly Cost |
|-------|---------|-------------|
| 1 | Azure OpenAI | ~$5-10 |
| 1 | Azure AI Search (Free) | $0 |
| 2 | Langfuse Cloud (Free) | $0 |
| 2 | DeepEval (OSS) | $0 |
| 2 | LangGraph (OSS) | $0 |
| 3 | Azure ML (Free) | $0 |
| 3 | Azure Functions (Free) | $0 |
| 4 | Azure DevOps (Free) | $0 |
| 4 | Microsoft Purview | ~$2-5 |
| **Total** | | **~$10-15/mo** |

---

## Quick Reference: Key CLI Commands

```bash
# Start local development
docker compose up -d                              # PostgreSQL
uvicorn src.agents.api:app --port 8001 &          # Agent API
cd frontend && npm run dev                        # Frontend

# Run tests
pytest tests/unit/ -v                             # Unit tests
pytest tests/eval/ -v                             # Agent evaluation
cd frontend && npm test                           # Frontend tests

# Generate data
python3 -m src.data_simulator.fleet_simulator --compressors 100

# Run closed-loop workflow
curl -X POST http://localhost:8001/workflows/closed-loop \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003", "trigger": "manual"}'

# Check Terraform
cd infrastructure/terraform && terraform validate
cd infrastructure/terraform && terraform plan -var-file=envs/staging.tfvars

# Azure resource status
az resource list --resource-group altaviz-dev-rg --output table
az cognitiveservices account show --name altaviz-openai -g altaviz-dev-rg
az search service show --name altaviz-search -g altaviz-dev-rg
az ml workspace show --name altaviz-ml -g altaviz-dev-rg
```
