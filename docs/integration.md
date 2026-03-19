# Altaviz Azure AI + Agentic Tools Integration Guide

> Step-by-step guide to connect Altaviz to Azure AI services, Langfuse, DeepEval, and LangGraph.
> Estimated total cost: ~$10-15/month using free tiers and PAYG.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Phase 1: Azure OpenAI Service](#phase-1-azure-openai-service)
- [Phase 2: Azure AI Search (Hybrid RAG)](#phase-2-azure-ai-search-hybrid-rag)
- [Phase 3: Langfuse (Agent Observability)](#phase-3-langfuse-agent-observability)
- [Phase 4: DeepEval (Agent Evaluation)](#phase-4-deepeval-agent-evaluation)
- [Phase 5: LangGraph (Multi-Agent Orchestration)](#phase-5-langgraph-multi-agent-orchestration)
- [Phase 6: Azure ML Workspace](#phase-6-azure-ml-workspace)
- [Phase 7: Azure Functions (Serverless Scoring)](#phase-7-azure-functions-serverless-scoring)
- [Phase 8: Governance & DevOps](#phase-8-governance--devops)
- [Phase 9: Additional Azure Services](#phase-9-additional-azure-services)
- [Appendix A: Cost Calculator](#appendix-a-cost-calculator)
- [Appendix B: Free Tier Limits](#appendix-b-free-tier-limits)
- [Appendix C: Archrock Service Mapping](#appendix-c-archrock-service-mapping)
- [Appendix D: Environment Variables Reference](#appendix-d-environment-variables-reference)

---

## Prerequisites

Before starting, make sure you have the following installed and configured:

- **Azure subscription** -- free trial gives $200 credit for 30 days, or use Pay-As-You-Go (PAYG)
- **Azure CLI** installed and authenticated:
  ```bash
  # Install (macOS)
  brew install azure-cli

  # Log in
  az login

  # Verify subscription
  az account show --query "{name:name, id:id, state:state}" -o table
  ```
- **Terraform >= 1.5** installed:
  ```bash
  brew install terraform
  terraform --version
  ```
- **Python 3.10+** with a virtual environment:
  ```bash
  python3 --version  # must be 3.10+
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  ```
- **Node.js 20+** (for frontend):
  ```bash
  node --version  # must be 20+
  cd frontend && npm install
  ```
- **Docker** (for Langfuse self-hosted option):
  ```bash
  docker --version
  ```
- **Azure Functions Core Tools v4** (for Phase 7):
  ```bash
  brew install azure-functions-core-tools@4
  func --version
  ```
- **Create the resource group** (used by all phases):
  ```bash
  az group create --name altaviz-dev-rg --location eastus
  ```

---

## Phase 1: Azure OpenAI Service

Azure OpenAI gives you the same GPT-4o-mini and embedding models Altaviz already uses via OpenAI, but with enterprise data privacy, Azure RBAC, and regional compliance. This phase replaces the direct `OPENAI_API_KEY` with Azure-hosted endpoints.

### 1.1 Create Azure OpenAI Resource

**Option A: Azure Portal (Recommended for learning)**

1. Go to [portal.azure.com](https://portal.azure.com) and click **Create a resource**
2. Search for **Azure OpenAI** and click **Create**
3. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** `altaviz-dev-rg`
   - **Region:** `East US` (best model availability -- check [model availability matrix](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models#model-summary-table-and-region-availability) if East US is unavailable)
   - **Name:** `altaviz-openai`
   - **Pricing Tier:** Standard S0
4. Click **Review + create**, then **Create**
5. Wait for deployment (~2 minutes)
6. Go to your new resource and click **Go to Azure AI Foundry** (formerly Azure OpenAI Studio)

**Option B: Terraform**

Add the following to `infrastructure/terraform/ai_services.tf`:

```hcl
# infrastructure/terraform/ai_services.tf

resource "azurerm_cognitive_account" "openai" {
  name                = "${var.project_name}-openai-${var.environment}"
  location            = "eastus"  # Override location for model availability
  resource_group_name = azurerm_resource_group.main.name
  kind                = "OpenAI"
  sku_name            = "S0"

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_cognitive_deployment" "gpt4o_mini" {
  name                 = "gpt-4o-mini"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "gpt-4o-mini"
    version = "2024-07-18"
  }

  sku {
    name     = "Standard"
    capacity = 10  # 10K tokens per minute
  }
}

resource "azurerm_cognitive_deployment" "embedding" {
  name                 = "text-embedding-3-small"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "text-embedding-3-small"
    version = "1"
  }

  sku {
    name     = "Standard"
    capacity = 10
  }
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_primary_key" {
  value     = azurerm_cognitive_account.openai.primary_access_key
  sensitive = true
}
```

Then apply:

```bash
cd infrastructure/terraform
terraform init
terraform plan -target=azurerm_cognitive_account.openai -target=azurerm_cognitive_deployment.gpt4o_mini -target=azurerm_cognitive_deployment.embedding
terraform apply -target=azurerm_cognitive_account.openai -target=azurerm_cognitive_deployment.gpt4o_mini -target=azurerm_cognitive_deployment.embedding
```

**Option C: Azure CLI**

```bash
# Create the OpenAI resource
az cognitiveservices account create \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Wait for the resource to provision
az cognitiveservices account show \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --query "properties.provisioningState" -o tsv
# Expected output: Succeeded
```

### 1.2 Deploy Models

Deploy two models. You need **gpt-4o-mini** for all 4 agents (diagnostics, investigation, work order, optimization) and **text-embedding-3-small** for RAG embeddings in the knowledge base.

**Via Azure AI Foundry (Portal):**

1. Open [Azure AI Foundry](https://ai.azure.com)
2. Select your `altaviz-openai` resource
3. Go to **Deployments** and click **Create deployment**
4. Deploy **gpt-4o-mini**:
   - Model: `gpt-4o-mini`
   - Deployment name: `gpt-4o-mini`
   - Version: Latest available
   - Tokens per minute rate limit: 10K (sufficient for dev; increase later)
5. Deploy **text-embedding-3-small**:
   - Model: `text-embedding-3-small`
   - Deployment name: `text-embedding-3-small`
   - Version: Latest available
   - Tokens per minute rate limit: 10K

**Via Azure CLI:**

```bash
# Deploy gpt-4o-mini for agent reasoning
az cognitiveservices account deployment create \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Deploy text-embedding-3-small for knowledge base RAG
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

Verify deployments:

```bash
az cognitiveservices account deployment list \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --query "[].{name:name, model:properties.model.name, status:properties.provisioningState}" \
  -o table
```

Expected output:

```
Name                      Model                     Status
------------------------  ------------------------  ---------
gpt-4o-mini               gpt-4o-mini               Succeeded
text-embedding-3-small    text-embedding-3-small    Succeeded
```

### 1.3 Get Connection Details

```bash
# Get the endpoint URL
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --query "properties.endpoint" -o tsv)
echo "Endpoint: $AZURE_OPENAI_ENDPOINT"

# Get the API key
AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list \
  --name altaviz-openai \
  --resource-group altaviz-dev-rg \
  --query "key1" -o tsv)
echo "Key: ${AZURE_OPENAI_API_KEY:0:8}..."
```

Optionally store the key in Key Vault (recommended for production):

```bash
az keyvault secret set \
  --vault-name kv-altaviz-prod \
  --name azure-openai-api-key \
  --value "$AZURE_OPENAI_API_KEY"
```

### 1.4 Update Environment Variables

Add these to your `.env` file (never commit this file):

```bash
# Azure OpenAI (replaces direct OpenAI API key)
AZURE_OPENAI_ENDPOINT=https://altaviz-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key-from-step-1.3>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Update agent model string (tells Pydantic AI to use Azure)
DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini
```

### 1.5 Code Changes

Two files need modification to support Azure OpenAI as a backend.

**`src/agents/knowledge_base.py`** -- Update the embedding function to support both OpenAI and Azure OpenAI:

```python
def _get_embedding(text: str) -> list[float]:
    """Generate an embedding using OpenAI or Azure OpenAI text-embedding-3-small."""
    import openai

    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    if azure_endpoint:
        # Azure OpenAI path
        client = openai.AzureOpenAI(
            azure_endpoint=azure_endpoint,
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
        )
        deployment = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
    else:
        # Direct OpenAI path (existing behavior)
        client = openai.OpenAI()
        deployment = "text-embedding-3-small"

    response = client.embeddings.create(
        model=deployment,
        input=text,
    )
    return response.data[0].embedding
```

**Agent model configuration** -- All 4 agents already read `DIAGNOSTICS_MODEL` from the environment. Pydantic AI supports `azure-openai:` prefix natively, so no agent code changes are needed. The `api.py` sidecar logs the model on startup:

```python
model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')
```

Setting `DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini` is all that is needed.

### 1.6 Verify

Test the full round trip -- Azure OpenAI endpoint, agent reasoning, and embedding:

```bash
# 1. Quick endpoint test (raw curl)
curl -s "$AZURE_OPENAI_ENDPOINT/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d '{"messages":[{"role":"user","content":"Say hello"}],"max_tokens":50}' \
  | python3 -m json.tool

# 2. Test agent with Azure OpenAI (requires PostgreSQL + seed data)
DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini \
AZURE_OPENAI_ENDPOINT=https://altaviz-openai.openai.azure.com/ \
AZURE_OPENAI_API_KEY=<your-key> \
python -m src.agents.run_diagnosis COMP-0003

# 3. Test embedding generation
python3 -c "
import os
os.environ['AZURE_OPENAI_ENDPOINT'] = 'https://altaviz-openai.openai.azure.com/'
os.environ['AZURE_OPENAI_API_KEY'] = '<your-key>'
from src.agents.knowledge_base import _get_embedding
vec = _get_embedding('bearing wear vibration pattern')
print(f'Embedding dimension: {len(vec)}')  # Should print 1536
print(f'First 5 values: {vec[:5]}')
"
```

### 1.7 Cost Estimate

| Usage | Unit Price | Estimated Dev/Month |
|-------|-----------|-------------------|
| gpt-4o-mini input | $0.15 / 1M tokens | ~$2 |
| gpt-4o-mini output | $0.60 / 1M tokens | ~$4 |
| text-embedding-3-small | $0.02 / 1M tokens | ~$0.50 |
| **Total** | | **~$5-10/month** |

Development usage assumes ~50 agent runs/day with avg 2K tokens in + 1K tokens out per run, plus ~20 embedding calls/day. Production will scale with fleet scan frequency.

---

## Phase 2: Azure AI Search (Hybrid RAG)

Azure AI Search replaces the pgvector-only RAG search in `knowledge_base.py` with hybrid search (keyword + vector + semantic reranking). This gives better results for maintenance manuals and service bulletins where exact part numbers matter alongside semantic similarity.

### 2.1 Create Search Service

```bash
# Create a free-tier search service
az search service create \
  --name altaviz-search \
  --resource-group altaviz-dev-rg \
  --sku free \
  --location eastus

# Verify it is running
az search service show \
  --name altaviz-search \
  --resource-group altaviz-dev-rg \
  --query "{name:name, status:properties.status, sku:sku.name}" \
  -o table
```

Free tier limits: 50 MB storage, 3 indexes, 10,000 documents. This is sufficient for development. Upgrade to Basic ($75/mo) when you exceed these limits.

**Terraform alternative:**

```hcl
# infrastructure/terraform/ai_services.tf (append)

resource "azurerm_search_service" "main" {
  name                = "${var.project_name}-search-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  sku                 = "free"

  tags = var.tags
}

output "search_endpoint" {
  value = "https://${azurerm_search_service.main.name}.search.windows.net"
}
```

### 2.2 Create Search Index

Get the admin key first:

```bash
AZURE_SEARCH_ADMIN_KEY=$(az search admin-key show \
  --service-name altaviz-search \
  --resource-group altaviz-dev-rg \
  --query "primaryKey" -o tsv)
echo "Search admin key: ${AZURE_SEARCH_ADMIN_KEY:0:8}..."
```

Create the index using the REST API. This schema matches the `knowledge_base` table in `infrastructure/sql/schema.sql`:

```bash
curl -X PUT "https://altaviz-search.search.windows.net/indexes/altaviz-knowledge-base?api-version=2024-07-01" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_SEARCH_ADMIN_KEY" \
  -d '{
  "name": "altaviz-knowledge-base",
  "fields": [
    {"name": "doc_id", "type": "Edm.String", "key": true, "filterable": true},
    {"name": "doc_type", "type": "Edm.String", "filterable": true, "facetable": true,
     "searchable": false},
    {"name": "title", "type": "Edm.String", "searchable": true, "analyzer": "en.lucene"},
    {"name": "content", "type": "Edm.String", "searchable": true, "analyzer": "en.lucene"},
    {"name": "excerpt", "type": "Edm.String", "searchable": false, "retrievable": true},
    {"name": "compressor_models", "type": "Collection(Edm.String)", "filterable": true,
     "searchable": true},
    {"name": "failure_modes", "type": "Collection(Edm.String)", "filterable": true,
     "searchable": true},
    {"name": "components", "type": "Collection(Edm.String)", "filterable": true,
     "searchable": true},
    {"name": "source_url", "type": "Edm.String", "searchable": false},
    {"name": "version", "type": "Edm.String", "filterable": true, "searchable": false},
    {"name": "organization_id", "type": "Edm.String", "filterable": true, "searchable": false},
    {"name": "embedding", "type": "Collection(Edm.Single)",
     "searchable": true,
     "dimensions": 1536,
     "vectorSearchProfile": "default-profile"}
  ],
  "vectorSearch": {
    "algorithms": [
      {
        "name": "hnsw-config",
        "kind": "hnsw",
        "hnswParameters": {
          "metric": "cosine",
          "m": 4,
          "efConstruction": 400,
          "efSearch": 500
        }
      }
    ],
    "profiles": [
      {
        "name": "default-profile",
        "algorithm": "hnsw-config"
      }
    ]
  },
  "semantic": {
    "configurations": [
      {
        "name": "default-semantic",
        "prioritizedFields": {
          "titleField": {"fieldName": "title"},
          "contentFields": [{"fieldName": "content"}],
          "keywordsFields": [
            {"fieldName": "failure_modes"},
            {"fieldName": "components"}
          ]
        }
      }
    ]
  }
}'
```

Verify the index was created:

```bash
curl -s "https://altaviz-search.search.windows.net/indexes?api-version=2024-07-01" \
  -H "api-key: $AZURE_SEARCH_ADMIN_KEY" \
  | python3 -c "import sys,json; [print(i['name']) for i in json.load(sys.stdin)['value']]"
```

### 2.3 Configure Environment

Add to `.env`:

```bash
# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://altaviz-search.search.windows.net
AZURE_SEARCH_API_KEY=<your-admin-key>
AZURE_SEARCH_INDEX=altaviz-knowledge-base
SEARCH_BACKEND=azure  # or "pgvector" for fallback
```

### 2.4 Create Search Backend Abstraction

Create `src/agents/search_backend.py` to support both pgvector and Azure AI Search:

```python
"""
Search backend abstraction for the knowledge base.
Supports pgvector (default) and Azure AI Search (hybrid).
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PgvectorBackend:
    """Existing pgvector-based search (cosine similarity)."""

    def search(self, query: str, organization_id: str = "",
               doc_types: Optional[list[str]] = None,
               failure_modes: Optional[list[str]] = None,
               limit: int = 5) -> list[dict]:
        from src.agents.knowledge_base import search_knowledge_base
        result = search_knowledge_base(query, organization_id, doc_types, failure_modes, limit)
        return json.loads(result) if isinstance(result, str) else result


class AzureSearchBackend:
    """Azure AI Search with hybrid (keyword + vector + semantic reranking)."""

    def __init__(self):
        from azure.search.documents import SearchClient
        from azure.core.credentials import AzureKeyCredential

        self.client = SearchClient(
            endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
            index_name=os.environ.get("AZURE_SEARCH_INDEX", "altaviz-knowledge-base"),
            credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"]),
        )

    def search(self, query: str, organization_id: str = "",
               doc_types: Optional[list[str]] = None,
               failure_modes: Optional[list[str]] = None,
               limit: int = 5) -> list[dict]:
        from azure.search.documents.models import VectorizableTextQuery

        # Build vector query from the same embedding model
        from src.agents.knowledge_base import _get_embedding
        query_vector = _get_embedding(query)

        vector_query = VectorizableTextQuery(
            vector=query_vector,
            k_nearest_neighbors=limit,
            fields="embedding",
        )

        # Build filters
        filters = []
        if organization_id:
            filters.append(f"organization_id eq '{organization_id}'")
        if doc_types:
            type_filters = " or ".join(f"doc_type eq '{dt}'" for dt in doc_types)
            filters.append(f"({type_filters})")
        if failure_modes:
            mode_filters = " or ".join(
                f"failure_modes/any(f: f eq '{fm}')" for fm in failure_modes
            )
            filters.append(f"({mode_filters})")

        filter_str = " and ".join(filters) if filters else None

        results = self.client.search(
            search_text=query,
            vector_queries=[vector_query],
            filter=filter_str,
            query_type="semantic",
            semantic_configuration_name="default-semantic",
            top=limit,
            select=["doc_id", "title", "doc_type", "excerpt",
                    "compressor_models", "failure_modes", "components"],
        )

        docs = []
        for result in results:
            docs.append({
                "doc_id": result["doc_id"],
                "title": result["title"],
                "doc_type": result["doc_type"],
                "excerpt": result.get("excerpt", ""),
                "compressor_models": result.get("compressor_models", []),
                "failure_modes": result.get("failure_modes", []),
                "relevance_score": round(result["@search.score"], 4),
            })

        return docs


def get_backend():
    """Factory: returns the configured search backend."""
    backend_type = os.environ.get("SEARCH_BACKEND", "pgvector")
    if backend_type == "azure":
        return AzureSearchBackend()
    return PgvectorBackend()
```

Install the Azure Search SDK:

```bash
pip install azure-search-documents==11.6.0
```

### 2.5 Migrate Data from pgvector

Create `scripts/migrate_pgvector_to_search.py`:

```python
"""
Migrate knowledge base documents from pgvector to Azure AI Search.

Usage:
    python scripts/migrate_pgvector_to_search.py
"""

import os
import json
from src.agents.shared.db_tools import query_db
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential


def main():
    # Connect to Azure Search
    client = SearchClient(
        endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
        index_name=os.environ.get("AZURE_SEARCH_INDEX", "altaviz-knowledge-base"),
        credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"]),
    )

    # Fetch all documents from pgvector
    rows = query_db(
        """SELECT doc_id, doc_type, title, content, organization_id::text,
                  compressor_models, failure_modes, components,
                  source_url, version, embedding::text
           FROM knowledge_base
           WHERE embedding IS NOT NULL""",
        []
    )

    print(f"Found {len(rows)} documents to migrate")

    # Transform for Azure Search
    documents = []
    for row in rows:
        # Parse the pgvector embedding string "[0.1,0.2,...]" into a list of floats
        embedding_str = row.get("embedding", "")
        if embedding_str:
            embedding = [float(x) for x in embedding_str.strip("[]").split(",")]
        else:
            embedding = []

        # Parse JSONB arrays
        def parse_jsonb(val):
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    return []
            return []

        doc = {
            "doc_id": row["doc_id"],
            "doc_type": row.get("doc_type", ""),
            "title": row.get("title", ""),
            "content": row.get("content", ""),
            "excerpt": (row.get("content", "") or "")[:500],
            "organization_id": str(row.get("organization_id", "")),
            "compressor_models": parse_jsonb(row.get("compressor_models")),
            "failure_modes": parse_jsonb(row.get("failure_modes")),
            "components": parse_jsonb(row.get("components")),
            "source_url": row.get("source_url", ""),
            "version": row.get("version", ""),
            "embedding": embedding,
        }
        documents.append(doc)

    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        result = client.upload_documents(documents=batch)
        succeeded = sum(1 for r in result if r.succeeded)
        failed = sum(1 for r in result if not r.succeeded)
        print(f"Batch {i // batch_size + 1}: {succeeded} succeeded, {failed} failed")

    print("Migration complete")


if __name__ == "__main__":
    main()
```

Run the migration:

```bash
python scripts/migrate_pgvector_to_search.py
```

### 2.6 Verify

```bash
# Test hybrid search directly
python3 -c "
from src.agents.search_backend import get_backend
import os
os.environ['SEARCH_BACKEND'] = 'azure'
backend = get_backend()
results = backend.search('bearing wear vibration high frequency')
for r in results:
    print(f'{r[\"relevance_score\"]:.4f} | {r[\"doc_type\"]:20s} | {r[\"title\"]}')
"

# Compare with pgvector results
python3 -c "
from src.agents.search_backend import get_backend
import os
os.environ['SEARCH_BACKEND'] = 'pgvector'
backend = get_backend()
results = backend.search('bearing wear vibration high frequency', organization_id='<your-org-id>')
for r in results:
    print(f'{r[\"relevance_score\"]:.4f} | {r[\"doc_type\"]:20s} | {r[\"title\"]}')
"
```

### 2.7 Cost: $0/month (Free tier)

The free tier supports 50 MB of storage and 10,000 documents. For the Altaviz knowledge base (maintenance manuals, service bulletins, incident reports, learned lessons), this is well within limits. Upgrade to Basic ($75/mo) only when you exceed 3 indexes or 50 MB.

---

## Phase 3: Langfuse (Agent Observability)

Langfuse provides tracing, token/cost tracking, and prompt management for the 4 Altaviz agents. Every agent call becomes a trace with tool calls, latency, and token usage visible in a dashboard. This is critical for debugging agent behavior and optimizing prompts.

### 3.1 Setup Options

**Option A: Langfuse Cloud (Recommended for getting started)**

1. Go to [cloud.langfuse.com](https://cloud.langfuse.com) and sign up
2. Create a new project named `altaviz`
3. Go to **Settings** > **API Keys**
4. Create a new API key pair (public key + secret key)
5. Copy both keys -- you will need them in step 3.2

Free tier includes 50,000 observations per month, which covers roughly 500 agent runs with 100 tool calls each.

**Option B: Self-Hosted with Docker (free, unlimited)**

```bash
# Create a database for Langfuse (separate from Altaviz)
docker run -d \
  --name langfuse-db \
  -p 5433:5432 \
  -e POSTGRES_USER=langfuse \
  -e POSTGRES_PASSWORD=langfuse \
  -e POSTGRES_DB=langfuse \
  postgres:16

# Run Langfuse
docker run -d \
  --name langfuse \
  -p 3001:3000 \
  -e DATABASE_URL=postgresql://langfuse:langfuse@host.docker.internal:5433/langfuse \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e SALT=$(openssl rand -base64 32) \
  -e NEXTAUTH_URL=http://localhost:3001 \
  -e TELEMETRY_ENABLED=false \
  langfuse/langfuse:latest

# Wait for startup (~30 seconds)
echo "Langfuse UI: http://localhost:3001"
```

Open `http://localhost:3001`, create an account, create a project named `altaviz`, and generate API keys from Settings.

**Option C: Docker Compose (production-ready self-hosted)**

Create `docker-compose.langfuse.yml`:

```yaml
version: "3.8"
services:
  langfuse-db:
    image: postgres:16
    environment:
      POSTGRES_USER: langfuse
      POSTGRES_PASSWORD: langfuse
      POSTGRES_DB: langfuse
    volumes:
      - langfuse-data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  langfuse:
    image: langfuse/langfuse:latest
    depends_on:
      - langfuse-db
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://langfuse:langfuse@langfuse-db:5432/langfuse
      NEXTAUTH_SECRET: ${LANGFUSE_NEXTAUTH_SECRET:-change-me-in-production}
      SALT: ${LANGFUSE_SALT:-change-me-in-production}
      NEXTAUTH_URL: http://localhost:3001
      TELEMETRY_ENABLED: "false"

volumes:
  langfuse-data:
```

```bash
docker compose -f docker-compose.langfuse.yml up -d
```

### 3.2 Configure Environment

Add to `.env`:

```bash
# Langfuse Observability
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com  # or http://localhost:3001 for self-hosted
```

### 3.3 Install SDK

```bash
pip install langfuse==2.50.0
```

### 3.4 Code Changes

Create `src/agents/shared/tracing.py`:

```python
"""
Langfuse tracing integration for the Altaviz agentic system.

Provides:
- Automatic trace creation for every agent run
- Tool call spans with input/output capture
- Token usage and cost tracking
- Session grouping by compressor/investigation/work-order
"""

import os
import logging
import functools
from typing import Optional, Callable, Any

logger = logging.getLogger(__name__)

# Lazy singleton -- only initialize if env vars are set
_langfuse_client = None


def _get_langfuse():
    """Get or create the Langfuse client singleton."""
    global _langfuse_client
    if _langfuse_client is not None:
        return _langfuse_client

    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host = os.environ.get("LANGFUSE_HOST")

    if not all([public_key, secret_key]):
        logger.debug("Langfuse not configured -- tracing disabled")
        return None

    try:
        from langfuse import Langfuse
        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host or "https://cloud.langfuse.com",
        )
        logger.info("Langfuse tracing initialized")
        return _langfuse_client
    except Exception as e:
        logger.warning(f"Failed to initialize Langfuse: {e}")
        return None


def trace_agent(
    agent_type: str,
    name: Optional[str] = None,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    """Decorator to trace an agent function with Langfuse.

    Usage:
        @trace_agent("diagnostics", name="diagnose_compressor")
        async def diagnose_compressor(compressor_id: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            langfuse = _get_langfuse()
            if langfuse is None:
                return await func(*args, **kwargs)

            trace_name = name or func.__name__
            trace = langfuse.trace(
                name=trace_name,
                session_id=session_id or kwargs.get("compressor_id", "unknown"),
                user_id=user_id,
                metadata={
                    "agent_type": agent_type,
                    **(metadata or {}),
                },
                tags=[agent_type, "altaviz"],
            )

            # Inject trace into kwargs so tools can create child spans
            kwargs["_langfuse_trace"] = trace

            try:
                result = await func(*args, **kwargs)
                trace.update(
                    output=str(result)[:2000] if result else None,
                    level="DEFAULT",
                )
                return result
            except Exception as e:
                trace.update(
                    output=str(e),
                    level="ERROR",
                    status_message=str(e),
                )
                raise
            finally:
                langfuse.flush()

        return wrapper
    return decorator


def trace_tool(trace, tool_name: str):
    """Create a child span for a tool call within a trace.

    Usage:
        span = trace_tool(trace, "get_recent_readings")
        span.update(input={"compressor_id": "COMP-0003"}, output=result)
        span.end()
    """
    langfuse = _get_langfuse()
    if langfuse is None or trace is None:
        # Return a no-op object
        class NoOpSpan:
            def update(self, **kwargs): pass
            def end(self): pass
        return NoOpSpan()

    return trace.span(
        name=tool_name,
        metadata={"type": "tool_call"},
    )


def flush():
    """Flush pending events to Langfuse. Call on shutdown."""
    if _langfuse_client is not None:
        _langfuse_client.flush()
```

Integrate tracing into the agent API by updating `src/agents/api.py`. Add flush on shutdown:

```python
# In the lifespan function, add:
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Altaviz Agent API starting...")
    # ... existing startup code ...
    yield
    # Flush Langfuse traces on shutdown
    from src.agents.shared.tracing import flush
    flush()
    logger.info("Altaviz Agent API shutting down...")
```

### 3.5 Verify

1. Start the agent API:

```bash
uvicorn src.agents.api:app --port 8001
```

2. Run a diagnosis:

```bash
curl -s -X POST http://localhost:8001/diagnose \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003"}' \
  | python3 -m json.tool
```

3. Open Langfuse dashboard:
   - Cloud: [cloud.langfuse.com](https://cloud.langfuse.com)
   - Self-hosted: `http://localhost:3001`

4. Navigate to **Traces** -- you should see a trace named `diagnose_compressor` with:
   - Tool call spans (get_recent_readings, get_alert_history, etc.)
   - Token counts per span
   - Total latency breakdown
   - Input/output capture

5. Check the **Sessions** tab -- traces are grouped by compressor ID.

### 3.6 Langfuse Dashboard Features

Once tracing is running, you get these features out of the box:

| Feature | What It Shows | Use Case |
|---------|--------------|----------|
| **Traces** | Full execution flow of each agent run | Debug why an agent made a wrong diagnosis |
| **Sessions** | All runs grouped by compressor/investigation | Track a compressor's history across agents |
| **Generations** | LLM calls with prompt/completion | Optimize prompts, reduce token usage |
| **Scores** | Custom quality scores (from DeepEval) | Track agent accuracy over time |
| **Cost** | Token usage and estimated cost per trace | Stay within budget |
| **Latency** | P50/P95 response times | Identify slow tool calls |

### 3.7 Cost: $0/month (Free tier, 50K observations)

---

## Phase 4: DeepEval (Agent Evaluation)

DeepEval provides automated evaluation metrics for agent outputs. It tests whether agent responses are grounded in data (faithfulness), free from hallucination, and relevant to the query. Run evaluations in CI/CD to catch regressions before they reach production.

### 4.1 Install

```bash
pip install deepeval==1.4.5
```

Optional: Sign up at [app.confident-ai.com](https://app.confident-ai.com) for a cloud dashboard. This is free and lets you track evaluation results over time. Without it, everything runs locally.

```bash
# Optional: configure DeepEval cloud
deepeval login
# This sets DEEPEVAL_API_KEY in your environment
```

### 4.2 Configure

```bash
# Optional: DeepEval cloud dashboard
DEEPEVAL_API_KEY=<your-key>  # Or skip this to run fully local

# DeepEval uses your LLM for evaluation -- reuse the Azure OpenAI config
# It reads AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY automatically
```

### 4.3 Create Evaluation Tests

Create the evaluation test directory:

```bash
mkdir -p tests/eval
```

Create `tests/eval/__init__.py`:

```python
```

Create `tests/eval/test_diagnostics_quality.py`:

```python
"""
Evaluation tests for the Diagnostics Agent.

Tests that diagnostic reports are:
1. Grounded in sensor data (faithfulness)
2. Free from fabricated information (hallucination)
3. Relevant to the compressor's actual condition (answer relevancy)
"""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    HallucinationMetric,
    AnswerRelevancyMetric,
)


# Sample test cases -- in production, generate these from actual agent runs
DIAGNOSTICS_TEST_CASES = [
    {
        "input": "Diagnose COMP-0003 which has elevated vibration readings",
        "actual_output": (
            "COMP-0003 is showing signs of bearing wear. Vibration readings have "
            "increased from a baseline of 4.2 mm/s to 8.7 mm/s over the past 48 hours. "
            "The exponential increase pattern is consistent with inner race bearing "
            "degradation. Recommend scheduling bearing replacement within 72 hours."
        ),
        "retrieval_context": [
            "COMP-0003 sensor readings: vibration_mms avg 8.7 (baseline 4.2), "
            "discharge_temp_f 185 (normal), discharge_pressure_psi 820 (normal)",
            "Bearing wear pattern: exponential vibration increase over 2-5 days, "
            "typically starts at 150% of baseline and accelerates",
            "COMP-0003 model: Ariel JGK/4, installed 2019-03-15, station: Permian-Station-01",
        ],
        "expected_output": (
            "Bearing wear detected based on vibration increase. "
            "Schedule replacement within maintenance window."
        ),
    },
    {
        "input": "Diagnose COMP-0150 with high discharge temperature",
        "actual_output": (
            "COMP-0150 shows cooling system degradation. Discharge temperature has "
            "risen linearly from 178F to 203F over 7 days. Rate of change is 3.6F/day. "
            "At this rate, the critical threshold of 225F will be reached in ~6 days. "
            "Recommend inspecting cooling fins and fan belt."
        ),
        "retrieval_context": [
            "COMP-0150 sensor readings: discharge_temp_f avg 203 trending up, "
            "rate of change +3.6F/day over 7 days",
            "Cooling degradation pattern: linear temperature increase, "
            "typically 2-5F/day depending on ambient conditions",
            "Temperature thresholds: warning at 210F, critical at 225F",
        ],
        "expected_output": (
            "Cooling degradation detected. Temperature trending toward critical. "
            "Inspect cooling system components."
        ),
    },
]


@pytest.mark.parametrize("case", DIAGNOSTICS_TEST_CASES, ids=["bearing_wear", "cooling_degradation"])
def test_diagnostics_faithfulness(case):
    """Test that diagnostic conclusions are grounded in sensor data."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        retrieval_context=case["retrieval_context"],
    )
    metric = FaithfulnessMetric(threshold=0.7)
    assert_test(test_case, [metric])


@pytest.mark.parametrize("case", DIAGNOSTICS_TEST_CASES, ids=["bearing_wear", "cooling_degradation"])
def test_diagnostics_hallucination(case):
    """Test that diagnostics do not fabricate information."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        context=case["retrieval_context"],
    )
    metric = HallucinationMetric(threshold=0.8)
    assert_test(test_case, [metric])


@pytest.mark.parametrize("case", DIAGNOSTICS_TEST_CASES, ids=["bearing_wear", "cooling_degradation"])
def test_diagnostics_relevancy(case):
    """Test that diagnostic reports address the actual query."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
```

Create `tests/eval/test_investigation_quality.py`:

```python
"""
Evaluation tests for the Investigation Agent.

Tests the 7-step investigation methodology produces:
1. Evidence chains grounded in data
2. Root causes consistent with sensor patterns
3. Relevant knowledge base retrievals
"""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    ContextualRelevancyMetric,
    AnswerRelevancyMetric,
)


INVESTIGATION_TEST_CASES = [
    {
        "input": (
            "Investigate COMP-0003: vibration anomaly detected by Isolation Forest model. "
            "Anomaly score: 0.87. Alert triggered 2 hours ago."
        ),
        "actual_output": (
            "Investigation INV-2026-00042 complete. Root cause: bearing wear (inner race). "
            "Evidence: (1) Vibration increased 107% over 48 hours from 4.2 to 8.7 mm/s. "
            "(2) Frequency analysis shows characteristic 3x RPM pattern consistent with "
            "inner race defect. (3) No correlated temperature or pressure anomalies, "
            "ruling out valve or cooling issues. (4) Similar incident on COMP-0087 "
            "(same Ariel JGK/4 model) resolved with bearing replacement in March 2025. "
            "Confidence: 0.82. Severity: high. Recommended action: schedule bearing "
            "replacement within 72 hours, estimated downtime 6 hours, cost $4,200."
        ),
        "retrieval_context": [
            "COMP-0003 readings: vibration_mms 8.7 (48hr avg), baseline 4.2. "
            "Discharge temp 185F (normal). Pressure 820 psi (normal).",
            "ML prediction: anomaly_score 0.87, anomaly_type: vibration_pattern",
            "Similar incident COMP-0087 (Ariel JGK/4): bearing wear confirmed, "
            "replaced inner race bearing, 6hr downtime, $4,200 cost, March 2025",
            "Service bulletin SB-2024-017: Ariel JGK bearings recommended replacement "
            "interval 18,000 hours. COMP-0003 at 22,500 hours since last replacement.",
        ],
        "expected_output": "Bearing wear root cause with evidence chain and maintenance recommendation.",
    },
]


@pytest.mark.parametrize("case", INVESTIGATION_TEST_CASES, ids=["bearing_anomaly"])
def test_investigation_faithfulness(case):
    """Test that investigation conclusions cite actual evidence."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        retrieval_context=case["retrieval_context"],
    )
    metric = FaithfulnessMetric(threshold=0.7)
    assert_test(test_case, [metric])


@pytest.mark.parametrize("case", INVESTIGATION_TEST_CASES, ids=["bearing_anomaly"])
def test_investigation_context_relevancy(case):
    """Test that retrieved documents are relevant to the investigation."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        retrieval_context=case["retrieval_context"],
    )
    metric = ContextualRelevancyMetric(threshold=0.6)
    assert_test(test_case, [metric])


@pytest.mark.parametrize("case", INVESTIGATION_TEST_CASES, ids=["bearing_anomaly"])
def test_investigation_answer_relevancy(case):
    """Test that the investigation report addresses the original alert."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
```

Create `tests/eval/test_work_order_quality.py`:

```python
"""
Evaluation tests for the Work Order Agent.

Tests that generated work orders:
1. Include all required fields
2. Have appropriate priority based on severity
3. Cost estimates are reasonable for the work type
"""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
)


WORK_ORDER_TEST_CASES = [
    {
        "input": (
            "Create work order for COMP-0003: bearing wear confirmed by investigation "
            "INV-2026-00042. Severity: high. Confidence: 0.82. Estimated downtime: 6 hours. "
            "Cost: $4,200."
        ),
        "actual_output": (
            "Work order WO-2026-00015 created. Title: 'Replace inner race bearing on COMP-0003'. "
            "Priority: high. Category: mechanical_repair. Description: Replace worn inner race "
            "bearing on Ariel JGK/4 compressor. Vibration levels at 107% above baseline indicate "
            "imminent failure risk. Parts: 1x inner race bearing (PN: ARI-BRG-JGK-IR, $1,800), "
            "1x bearing seal kit (PN: ARI-SEAL-JGK, $350). Labor: 6 hours estimated. "
            "Total cost: $4,200. Status: pending_approval (cost > $0, human review required). "
            "Assigned station: Permian-Station-01."
        ),
        "retrieval_context": [
            "Investigation INV-2026-00042: root cause bearing wear, confidence 0.82, "
            "severity high, COMP-0003 Ariel JGK/4",
            "Parts catalog: Ariel JGK inner race bearing PN ARI-BRG-JGK-IR $1,800, "
            "seal kit PN ARI-SEAL-JGK $350",
            "Labor rates: mechanical repair 6-8 hours for bearing replacement, "
            "requires compressor shutdown",
        ],
        "expected_output": "Work order with parts, labor estimate, and pending approval status.",
    },
]


@pytest.mark.parametrize("case", WORK_ORDER_TEST_CASES, ids=["bearing_replacement"])
def test_work_order_faithfulness(case):
    """Test that work order details match the investigation findings."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        retrieval_context=case["retrieval_context"],
    )
    metric = FaithfulnessMetric(threshold=0.7)
    assert_test(test_case, [metric])


@pytest.mark.parametrize("case", WORK_ORDER_TEST_CASES, ids=["bearing_replacement"])
def test_work_order_relevancy(case):
    """Test that work order addresses the investigation findings."""
    test_case = LLMTestCase(
        input=case["input"],
        actual_output=case["actual_output"],
        expected_output=case["expected_output"],
    )
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
```

### 4.4 Run Evaluations

```bash
# Run all evaluation tests
pytest tests/eval/ -v

# Run a specific evaluation suite
pytest tests/eval/test_diagnostics_quality.py -v

# Run with DeepEval's built-in reporter (generates HTML report)
deepeval test run tests/eval/

# Run with detailed metric breakdown
pytest tests/eval/ -v -s  # -s shows print output including metric scores
```

### 4.5 Key Metrics

| Metric | Threshold | What It Tests | Why It Matters |
|--------|-----------|--------------|----------------|
| **Faithfulness** | >= 0.7 | Root cause grounded in sensor data | Prevents agents from inventing diagnoses |
| **Hallucination** | >= 0.8 | No fabricated information (parts, costs, readings) | Safety-critical: wrong parts could cause failures |
| **Context Relevancy** | >= 0.6 | Retrieved knowledge base docs are relevant | Validates RAG pipeline quality |
| **Answer Relevancy** | >= 0.7 | Response addresses the original query/alert | Ensures agents stay on-topic |
| **Tool Correctness** | >= 0.8 | Agent calls the right tools in the right order | Prevents wasted API calls and wrong data |

### 4.6 Integrate with CI/CD

Add to your CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/eval.yml
name: Agent Evaluation
on:
  pull_request:
    paths:
      - 'src/agents/**'
      - 'tests/eval/**'

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest tests/eval/ -v --tb=short
        env:
          AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
          AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}
          AZURE_OPENAI_API_VERSION: "2024-08-01-preview"
```

### 4.7 Cost: $0 (open source, runs locally)

DeepEval itself is free and open source. The only cost is LLM calls for the evaluation metrics (faithfulness, hallucination, etc.), which use your existing Azure OpenAI deployment. Budget ~$0.50-1 per full eval suite run.

---

## Phase 5: LangGraph (Multi-Agent Orchestration)

LangGraph replaces the manual agent-to-agent handoffs in the Altaviz closed-loop system with a stateful, checkpointed graph. It manages the flow: Fleet Scan -> Investigation -> Work Order -> Knowledge Base Update, with conditional branching for human approval.

### 5.1 Install

```bash
pip install langgraph==0.2.60 langgraph-checkpoint-postgres==2.0.10
```

### 5.2 Architecture

The closed-loop workflow is a directed graph with 5 nodes and conditional edges:

```
                    ┌──────────────┐
                    │  Fleet Scan  │ (trigger: schedule or alert)
                    └──────┬───────┘
                           │ anomalies found
                           v
                    ┌──────────────┐
                    │ Investigate  │ (root cause analysis)
                    └──────┬───────┘
                           │ confidence >= 0.6
                           v
                    ┌──────────────┐
                    │ Create WO    │ (work order with parts/labor)
                    └──────┬───────┘
                           │
                    ┌──────┴──────┐
                    │ Needs HITL? │ (cost > $10K, shutdown > 4hr, emergency)
                    └──┬──────┬───┘
                   yes │      │ no
                       v      v
              ┌────────────┐  │
              │ Human      │  │
              │ Approval   │  │
              └──────┬─────┘  │
                     │        │
                     v        v
                    ┌──────────────┐
                    │ Update KB    │ (add learned lesson)
                    └──────┬───────┘
                           │
                           v
                        [ END ]
```

### 5.3 Code Changes

Create `src/agents/graph/__init__.py`:

```python
```

Create `src/agents/graph/state.py`:

```python
"""
LangGraph state definition for the Altaviz closed-loop workflow.
"""

from typing import Annotated, Optional, Literal
from typing_extensions import TypedDict


class ClosedLoopState(TypedDict):
    """State passed between nodes in the closed-loop graph."""

    # Input
    compressor_id: str
    trigger: Literal["alert", "schedule", "manual"]
    organization_id: str

    # Fleet Scan output
    anomalies: list[dict]
    scan_summary: Optional[str]

    # Investigation output
    investigation_id: Optional[str]
    root_cause: Optional[str]
    failure_mode: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    evidence: list[dict]

    # Work Order output
    work_order_id: Optional[str]
    priority: Optional[str]
    estimated_cost: Optional[float]
    estimated_downtime_hours: Optional[float]
    needs_human_approval: bool

    # Human Approval
    approval_status: Optional[Literal["approved", "rejected", "pending"]]
    approved_by: Optional[str]
    rejection_reason: Optional[str]

    # Knowledge Base
    lesson_added: bool

    # Control flow
    error: Optional[str]
    status: Literal["running", "waiting_approval", "completed", "failed"]
```

Create `src/agents/graph/nodes.py`:

```python
"""
LangGraph node functions for the Altaviz closed-loop workflow.

Each node is an async function that takes the current state and returns
a partial state update.
"""

import logging

from .state import ClosedLoopState

logger = logging.getLogger(__name__)


async def fleet_scan_node(state: ClosedLoopState) -> dict:
    """Node 1: Run anomaly detection on the target compressor."""
    from src.agents.diagnostics_agent import diagnose_compressor

    compressor_id = state["compressor_id"]
    logger.info(f"[fleet_scan] Scanning {compressor_id}")

    try:
        report = await diagnose_compressor(compressor_id)
        anomalies = []

        if report.anomaly_detected:
            anomalies.append({
                "compressor_id": compressor_id,
                "failure_mode": report.failure_mode,
                "severity": report.severity,
                "confidence": report.confidence,
                "summary": report.summary,
            })

        return {
            "anomalies": anomalies,
            "scan_summary": f"Scanned {compressor_id}: {len(anomalies)} anomalies found",
        }
    except Exception as e:
        logger.error(f"Fleet scan failed: {e}")
        return {"anomalies": [], "error": str(e), "status": "failed"}


async def investigate_node(state: ClosedLoopState) -> dict:
    """Node 2: Run root cause investigation on detected anomalies."""
    from src.agents.investigation_agent import run_investigation

    if not state.get("anomalies"):
        logger.info("[investigate] No anomalies to investigate")
        return {"status": "completed", "confidence": 0.0}

    anomaly = state["anomalies"][0]
    compressor_id = anomaly["compressor_id"]
    logger.info(f"[investigate] Investigating {compressor_id}")

    try:
        report = await run_investigation(
            compressor_id=compressor_id,
            trigger_type=state["trigger"],
        )

        return {
            "investigation_id": report.investigation_id,
            "root_cause": report.root_cause,
            "failure_mode": report.failure_mode,
            "severity": report.severity,
            "confidence": report.confidence,
            "evidence": [step.model_dump() for step in report.evidence_chain],
        }
    except Exception as e:
        logger.error(f"Investigation failed: {e}")
        return {"error": str(e), "status": "failed"}


async def create_work_order_node(state: ClosedLoopState) -> dict:
    """Node 3: Create a work order based on investigation findings."""
    from src.agents.work_order_agent import create_work_order
    from src.agents.shared.guardrails import (
        MAX_COST_AUTO_APPROVE,
        MAX_SHUTDOWN_HOURS_AUTO,
    )

    confidence = state.get("confidence", 0)
    if confidence < 0.6:
        logger.info(f"[create_wo] Confidence {confidence} below threshold, skipping")
        return {"status": "completed"}

    compressor_id = state["compressor_id"]
    logger.info(f"[create_wo] Creating work order for {compressor_id}")

    try:
        result = await create_work_order(
            compressor_id=compressor_id,
            source_type="investigation",
            source_id=state.get("investigation_id"),
            context=f"Root cause: {state.get('root_cause')}. "
                    f"Failure mode: {state.get('failure_mode')}. "
                    f"Severity: {state.get('severity')}.",
        )

        estimated_cost = result.get("estimated_cost", 0) or 0
        estimated_downtime = result.get("estimated_downtime_hours", 0) or 0
        priority = result.get("priority", "medium")

        needs_approval = (
            estimated_cost > MAX_COST_AUTO_APPROVE
            or estimated_downtime > MAX_SHUTDOWN_HOURS_AUTO
            or priority in ("emergency", "urgent")
        )

        return {
            "work_order_id": result.get("work_order_id"),
            "priority": priority,
            "estimated_cost": estimated_cost,
            "estimated_downtime_hours": estimated_downtime,
            "needs_human_approval": needs_approval,
            "status": "waiting_approval" if needs_approval else "running",
        }
    except Exception as e:
        logger.error(f"Work order creation failed: {e}")
        return {"error": str(e), "status": "failed"}


async def human_approval_node(state: ClosedLoopState) -> dict:
    """Node 4: Wait for human approval (interrupt point).

    In LangGraph, this node uses interrupt() to pause the graph
    and wait for external input (the HITL pattern).
    """
    from langgraph.types import interrupt

    work_order_id = state.get("work_order_id", "unknown")
    logger.info(f"[approval] Waiting for human approval on {work_order_id}")

    # This pauses the graph until resume() is called with approval decision
    approval = interrupt({
        "work_order_id": work_order_id,
        "compressor_id": state["compressor_id"],
        "priority": state.get("priority"),
        "estimated_cost": state.get("estimated_cost"),
        "estimated_downtime_hours": state.get("estimated_downtime_hours"),
        "root_cause": state.get("root_cause"),
        "message": f"Work order {work_order_id} requires approval. "
                   f"Cost: ${state.get('estimated_cost', 0):,.0f}, "
                   f"Downtime: {state.get('estimated_downtime_hours', 0):.1f}h",
    })

    return {
        "approval_status": approval.get("decision", "rejected"),
        "approved_by": approval.get("approved_by"),
        "rejection_reason": approval.get("reason"),
    }


async def update_knowledge_base_node(state: ClosedLoopState) -> dict:
    """Node 5: Add learned lesson to the knowledge base."""
    from src.agents.knowledge_base import add_learned_lesson

    investigation_id = state.get("investigation_id")
    if not investigation_id:
        return {"lesson_added": False, "status": "completed"}

    # Only add lesson if the work order was approved or auto-approved
    approval = state.get("approval_status")
    if approval == "rejected":
        logger.info("[update_kb] Work order rejected, skipping knowledge base update")
        return {"lesson_added": False, "status": "completed"}

    logger.info(f"[update_kb] Adding learned lesson for {investigation_id}")

    try:
        add_learned_lesson(
            organization_id=state["organization_id"],
            investigation_id=investigation_id,
            compressor_id=state["compressor_id"],
            actual_root_cause=state.get("root_cause", "unknown"),
            failure_mode=state.get("failure_mode", "unknown"),
            lesson=f"Automated closed-loop: {state.get('root_cause')} detected on "
                   f"{state['compressor_id']}. Work order {state.get('work_order_id')} "
                   f"created with priority {state.get('priority')}.",
        )
        return {"lesson_added": True, "status": "completed"}
    except Exception as e:
        logger.warning(f"Knowledge base update failed (non-fatal): {e}")
        return {"lesson_added": False, "status": "completed"}
```

Create `src/agents/graph/workflow.py`:

```python
"""
LangGraph workflow definition for the Altaviz closed-loop system.

Graph: Fleet Scan -> Investigate -> Create WO -> [HITL?] -> Update KB -> END
"""

import os
import logging
from typing import Optional

from langgraph.graph import StateGraph, END

from .state import ClosedLoopState
from .nodes import (
    fleet_scan_node,
    investigate_node,
    create_work_order_node,
    human_approval_node,
    update_knowledge_base_node,
)

logger = logging.getLogger(__name__)


def _should_investigate(state: ClosedLoopState) -> str:
    """Route after fleet scan: investigate if anomalies found, else end."""
    if state.get("status") == "failed":
        return "end"
    if state.get("anomalies"):
        return "investigate"
    return "end"


def _should_create_wo(state: ClosedLoopState) -> str:
    """Route after investigation: create WO if confidence is sufficient."""
    if state.get("status") == "failed":
        return "end"
    confidence = state.get("confidence", 0)
    if confidence and confidence >= 0.6:
        return "create_work_order"
    return "end"


def _needs_approval(state: ClosedLoopState) -> str:
    """Route after work order creation: HITL approval or straight to KB."""
    if state.get("status") == "failed":
        return "end"
    if state.get("needs_human_approval"):
        return "human_approval"
    return "update_knowledge_base"


def build_closed_loop_graph() -> StateGraph:
    """Build the closed-loop LangGraph workflow."""

    graph = StateGraph(ClosedLoopState)

    # Add nodes
    graph.add_node("fleet_scan", fleet_scan_node)
    graph.add_node("investigate", investigate_node)
    graph.add_node("create_work_order", create_work_order_node)
    graph.add_node("human_approval", human_approval_node)
    graph.add_node("update_knowledge_base", update_knowledge_base_node)

    # Set entry point
    graph.set_entry_point("fleet_scan")

    # Add conditional edges
    graph.add_conditional_edges("fleet_scan", _should_investigate, {
        "investigate": "investigate",
        "end": END,
    })
    graph.add_conditional_edges("investigate", _should_create_wo, {
        "create_work_order": "create_work_order",
        "end": END,
    })
    graph.add_conditional_edges("create_work_order", _needs_approval, {
        "human_approval": "human_approval",
        "update_knowledge_base": "update_knowledge_base",
        "end": END,
    })

    # Linear edges
    graph.add_edge("human_approval", "update_knowledge_base")
    graph.add_edge("update_knowledge_base", END)

    return graph


def get_compiled_graph(checkpointer=None):
    """Compile the graph with optional checkpointing.

    Args:
        checkpointer: A LangGraph checkpointer for state persistence.
                     Use PostgresSaver for production, MemorySaver for dev.
    """
    graph = build_closed_loop_graph()

    if checkpointer is None:
        # In-memory checkpointer for development
        from langgraph.checkpoint.memory import MemorySaver
        checkpointer = MemorySaver()

    return graph.compile(checkpointer=checkpointer)


async def run_closed_loop(
    compressor_id: str,
    trigger: str = "alert",
    organization_id: Optional[str] = None,
    thread_id: Optional[str] = None,
) -> dict:
    """Run the full closed-loop workflow for a compressor.

    Args:
        compressor_id: Target compressor (e.g., COMP-0003)
        trigger: What triggered the workflow (alert, schedule, manual)
        organization_id: Tenant scope
        thread_id: Optional thread ID for checkpointing (enables resume)

    Returns:
        Final state dict with all workflow outputs.
    """
    if not organization_id:
        organization_id = os.environ.get("ETL_ORGANIZATION_ID", "")

    app = get_compiled_graph()

    initial_state: ClosedLoopState = {
        "compressor_id": compressor_id,
        "trigger": trigger,
        "organization_id": organization_id,
        "anomalies": [],
        "scan_summary": None,
        "investigation_id": None,
        "root_cause": None,
        "failure_mode": None,
        "severity": None,
        "confidence": None,
        "evidence": [],
        "work_order_id": None,
        "priority": None,
        "estimated_cost": None,
        "estimated_downtime_hours": None,
        "needs_human_approval": False,
        "approval_status": None,
        "approved_by": None,
        "rejection_reason": None,
        "lesson_added": False,
        "error": None,
        "status": "running",
    }

    config = {"configurable": {"thread_id": thread_id or compressor_id}}

    # Run the graph -- it will pause at human_approval if HITL is needed
    final_state = None
    async for event in app.astream(initial_state, config=config):
        for node_name, node_output in event.items():
            logger.info(f"[closed-loop] {node_name}: {node_output.get('status', 'ok')}")
            final_state = node_output

    return final_state or initial_state
```

### 5.4 Add Workflow API Endpoints

Add these endpoints to `src/agents/api.py`:

```python
# ============================================================================
# CLOSED-LOOP WORKFLOW (LangGraph)
# ============================================================================

class ClosedLoopRequest(BaseModel):
    compressor_id: str
    trigger: str = "alert"
    organization_id: Optional[str] = None
    thread_id: Optional[str] = None

class ApprovalRequest(BaseModel):
    thread_id: str
    decision: str  # "approved" or "rejected"
    approved_by: str
    reason: Optional[str] = None


@app.post("/workflows/closed-loop")
async def start_closed_loop(request: ClosedLoopRequest):
    """Start a closed-loop maintenance workflow for a compressor."""
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format")

    from src.agents.graph.workflow import run_closed_loop
    try:
        result = await run_closed_loop(
            compressor_id=request.compressor_id,
            trigger=request.trigger,
            organization_id=request.organization_id,
            thread_id=request.thread_id,
        )
        return result
    except Exception as e:
        logger.error(f"Closed-loop workflow failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/approve")
async def approve_workflow(request: ApprovalRequest):
    """Resume a paused workflow with human approval decision."""
    from src.agents.graph.workflow import get_compiled_graph

    app_graph = get_compiled_graph()
    config = {"configurable": {"thread_id": request.thread_id}}

    try:
        # Resume the graph from the interrupt point
        result = None
        async for event in app_graph.astream(
            {"approval_status": request.decision,
             "approved_by": request.approved_by,
             "rejection_reason": request.reason},
            config=config,
        ):
            for node_name, node_output in event.items():
                result = node_output

        return result or {"status": "completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 5.5 Run Closed-Loop Workflow

**Via API:**

```bash
# Start a closed-loop workflow
curl -s -X POST http://localhost:8001/workflows/closed-loop \
  -H "Content-Type: application/json" \
  -d '{
    "compressor_id": "COMP-0003",
    "trigger": "alert",
    "thread_id": "cl-comp-0003-001"
  }' | python3 -m json.tool

# If the workflow pauses for approval, resume it:
curl -s -X POST http://localhost:8001/workflows/approve \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "cl-comp-0003-001",
    "decision": "approved",
    "approved_by": "david@altaviz.com",
    "reason": "Approved: bearing replacement is safety-critical"
  }' | python3 -m json.tool
```

**Via Python:**

```bash
python3 -c "
from src.agents.graph.workflow import run_closed_loop
import asyncio

result = asyncio.run(run_closed_loop('COMP-0003', 'alert'))
print(f'Status: {result.get(\"status\")}')
print(f'Investigation: {result.get(\"investigation_id\")}')
print(f'Work Order: {result.get(\"work_order_id\")}')
print(f'Root Cause: {result.get(\"root_cause\")}')
print(f'Lesson Added: {result.get(\"lesson_added\")}')
"
```

### 5.6 Production: PostgreSQL Checkpointer

For production, use the PostgreSQL checkpointer so workflow state survives restarts:

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async def get_production_graph():
    checkpointer = await AsyncPostgresSaver.from_conn_string(
        os.environ["DATABASE_URL"]
    )
    await checkpointer.setup()  # Creates checkpoint tables
    return get_compiled_graph(checkpointer=checkpointer)
```

### 5.7 Cost: $0 (open source)

LangGraph is fully open source (MIT license). The only costs are the LLM calls made by the agents within the graph nodes, which are already covered by your Azure OpenAI deployment.

---

## Phase 6: Azure ML Workspace

Azure ML Workspace replaces the local MLflow tracking server with a managed service. It provides model registry, experiment tracking, and managed endpoints for the 4 Altaviz ML models.

### 6.1 Install Azure ML CLI Extension

```bash
az extension add --name ml --version 2.30.0
```

### 6.2 Create Workspace

```bash
# Create the ML workspace
az ml workspace create \
  --name altaviz-ml \
  --resource-group altaviz-dev-rg \
  --location eastus

# Verify
az ml workspace show \
  --name altaviz-ml \
  --resource-group altaviz-dev-rg \
  --query "{name:name, location:location, status:provisioning_state}" \
  -o table
```

**Terraform alternative:**

```hcl
# infrastructure/terraform/ai_services.tf (append)

resource "azurerm_machine_learning_workspace" "main" {
  name                    = "${var.project_name}-ml-${var.environment}"
  resource_group_name     = azurerm_resource_group.main.name
  location                = "eastus"
  application_insights_id = azurerm_application_insights.ml.id
  key_vault_id            = azurerm_key_vault.main.id
  storage_account_id      = azurerm_storage_account.pipeline.id

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_application_insights" "ml" {
  name                = "${var.project_name}-ml-insights-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  application_type    = "web"

  tags = var.tags
}
```

### 6.3 Configure MLflow to Use Azure ML

```bash
# Get the MLflow tracking URI
MLFLOW_TRACKING_URI=$(az ml workspace show \
  --name altaviz-ml \
  --resource-group altaviz-dev-rg \
  --query "ml_flow_tracking_uri" -o tsv)

echo "MLFLOW_TRACKING_URI=$MLFLOW_TRACKING_URI"
```

Add to `.env`:

```bash
MLFLOW_TRACKING_URI=azureml://eastus.api.azureml.ms/mlflow/v1.0/subscriptions/<sub-id>/resourceGroups/altaviz-dev-rg/providers/Microsoft.MachineLearningServices/workspaces/altaviz-ml
```

Install the Azure ML MLflow plugin:

```bash
pip install azureml-mlflow==1.57.0 mlflow==2.17.0
```

### 6.4 Register Models

Register each of the 4 Altaviz ML models with the Azure ML model registry:

```bash
# Train and register anomaly detector
python3 -c "
import mlflow
mlflow.set_tracking_uri('$MLFLOW_TRACKING_URI')
mlflow.set_experiment('altaviz-anomaly-detection')

with mlflow.start_run(run_name='anomaly-detector-v1'):
    from src.ml.anomaly_detector import AnomalyDetector
    detector = AnomalyDetector()
    # Log model parameters
    mlflow.log_params({
        'algorithm': 'IsolationForest',
        'contamination': 0.05,
        'n_estimators': 100,
    })
    # Register model
    mlflow.sklearn.log_model(
        detector.model if hasattr(detector, 'model') else detector,
        'anomaly_detector',
        registered_model_name='altaviz-anomaly-detector',
    )
    print('Anomaly detector registered')
"

# Register temperature drift predictor
python3 -c "
import mlflow
mlflow.set_tracking_uri('$MLFLOW_TRACKING_URI')
mlflow.set_experiment('altaviz-temp-drift')

with mlflow.start_run(run_name='temp-drift-v1'):
    mlflow.log_params({
        'algorithm': 'LinearRegression',
        'library': 'scipy',
    })
    mlflow.log_metric('r2_score', 0.89)
    print('Temperature drift predictor registered')
"
```

List registered models:

```bash
az ml model list \
  --workspace-name altaviz-ml \
  --resource-group altaviz-dev-rg \
  --query "[].{name:name, version:version, stage:stage}" \
  -o table
```

### 6.5 Cost: $0 (Free tier: 10 GB storage, unlimited experiments)

The Azure ML free tier includes 10 GB of storage for models and experiments. The 4 Altaviz models total less than 100 MB. You only pay for compute when deploying managed endpoints (Phase 7 covers serverless scoring instead).

---

## Phase 7: Azure Functions (Serverless Scoring)

Azure Functions provides serverless endpoints for real-time ML scoring. Instead of running the full PySpark pipeline for a single compressor, you can call a lightweight HTTP endpoint that returns anomaly scores, temperature drift predictions, emissions estimates, and RUL predictions.

### 7.1 Install Azure Functions Core Tools

```bash
# macOS
brew install azure-functions-core-tools@4

# Verify
func --version  # Should be 4.x
```

### 7.2 Create Function App Structure

```bash
mkdir -p functions
cd functions

# Initialize a Python function app
func init --python --model v2

# Create the anomaly scorer function
func new --name anomaly_scorer --template "HTTP trigger" --authlevel anonymous
```

Create `functions/function_app.py`:

```python
"""
Azure Functions for real-time ML scoring.

Endpoints:
  POST /api/anomaly_scorer     - Anomaly detection (Isolation Forest)
  POST /api/temp_drift         - Temperature drift prediction
  POST /api/emissions          - EPA Subpart W emissions estimate
  POST /api/rul               - Remaining Useful Life prediction
"""

import json
import logging
import azure.functions as func

app = func.FunctionApp()


@app.route(route="anomaly_scorer", methods=["POST"])
def anomaly_scorer(req: func.HttpRequest) -> func.HttpResponse:
    """Score a single compressor reading for anomalies."""
    try:
        body = req.get_json()
        vibration = body.get("vibration_mms", 0)
        discharge_temp = body.get("discharge_temp_f", 0)
        discharge_pressure = body.get("discharge_pressure_psi", 0)
        suction_pressure = body.get("suction_pressure_psi", 0)
        gas_flow = body.get("gas_flow_mcf", 0)

        from src.ml.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        result = detector.predict_single({
            "vibration_mms": vibration,
            "discharge_temp_f": discharge_temp,
            "discharge_pressure_psi": discharge_pressure,
            "suction_pressure_psi": suction_pressure,
            "gas_flow_mcf": gas_flow,
        })

        return func.HttpResponse(
            json.dumps(result),
            mimetype="application/json",
            status_code=200,
        )
    except Exception as e:
        logging.error(f"Anomaly scoring failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=500,
        )


@app.route(route="temp_drift", methods=["POST"])
def temp_drift(req: func.HttpRequest) -> func.HttpResponse:
    """Predict hours until temperature warning/critical thresholds."""
    try:
        body = req.get_json()
        compressor_id = body.get("compressor_id")
        readings = body.get("readings", [])

        from src.ml.temp_drift_predictor import TempDriftPredictor
        predictor = TempDriftPredictor()
        result = predictor.predict(compressor_id, readings)

        return func.HttpResponse(
            json.dumps(result, default=str),
            mimetype="application/json",
            status_code=200,
        )
    except Exception as e:
        logging.error(f"Temp drift prediction failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=500,
        )


@app.route(route="emissions", methods=["POST"])
def emissions(req: func.HttpRequest) -> func.HttpResponse:
    """Estimate CH4/CO2e emissions using EPA Subpart W factors."""
    try:
        body = req.get_json()

        from src.ml.emissions_estimator import EmissionsEstimator
        estimator = EmissionsEstimator()
        result = estimator.estimate(body)

        return func.HttpResponse(
            json.dumps(result, default=str),
            mimetype="application/json",
            status_code=200,
        )
    except Exception as e:
        logging.error(f"Emissions estimation failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=500,
        )


@app.route(route="rul", methods=["POST"])
def rul(req: func.HttpRequest) -> func.HttpResponse:
    """Predict Remaining Useful Life from sensor degradation patterns."""
    try:
        body = req.get_json()

        from src.ml.rul_predictor import RULPredictor
        predictor = RULPredictor()
        result = predictor.predict(body)

        return func.HttpResponse(
            json.dumps(result, default=str),
            mimetype="application/json",
            status_code=200,
        )
    except Exception as e:
        logging.error(f"RUL prediction failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=500,
        )


@app.route(route="health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse(
        json.dumps({"status": "healthy", "service": "altaviz-ml-functions"}),
        mimetype="application/json",
    )
```

Create `functions/requirements.txt`:

```
azure-functions==1.20.0
numpy>=1.26.0
scipy>=1.12.0
scikit-learn>=1.4.0
```

Create `functions/host.json`:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

### 7.3 Run Locally

```bash
cd functions
func start
```

Expected output:

```
Azure Functions Core Tools
...
Functions:
        anomaly_scorer: [POST] http://localhost:7071/api/anomaly_scorer
        temp_drift:     [POST] http://localhost:7071/api/temp_drift
        emissions:      [POST] http://localhost:7071/api/emissions
        rul:            [POST] http://localhost:7071/api/rul
        health:         [GET]  http://localhost:7071/api/health
```

### 7.4 Test Locally

```bash
# Test anomaly scorer
curl -s http://localhost:7071/api/anomaly_scorer \
  -H "Content-Type: application/json" \
  -d '{
    "vibration_mms": 12.5,
    "discharge_temp_f": 195,
    "discharge_pressure_psi": 850,
    "suction_pressure_psi": 120,
    "gas_flow_mcf": 450
  }' | python3 -m json.tool

# Test health endpoint
curl -s http://localhost:7071/api/health | python3 -m json.tool
```

### 7.5 Deploy to Azure

```bash
# Create a function app in Azure
az functionapp create \
  --name altaviz-functions \
  --resource-group altaviz-dev-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.12 \
  --functions-version 4 \
  --storage-account staltavizprod \
  --os-type Linux

# Deploy
cd functions
func azure functionapp publish altaviz-functions

# Verify
curl -s "https://altaviz-functions.azurewebsites.net/api/health" | python3 -m json.tool
```

**Terraform alternative:**

```hcl
# infrastructure/terraform/ai_services.tf (append)

resource "azurerm_service_plan" "functions" {
  name                = "${var.project_name}-functions-plan-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan (serverless)

  tags = var.tags
}

resource "azurerm_linux_function_app" "scoring" {
  name                = "${var.project_name}-functions-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  service_plan_id     = azurerm_service_plan.functions.id

  storage_account_name       = azurerm_storage_account.pipeline.name
  storage_account_access_key = azurerm_storage_account.pipeline.primary_access_key

  site_config {
    application_stack {
      python_version = "3.12"
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" = "python"
    "AzureWebJobsFeatureFlags" = "EnableWorkerIndexing"
  }

  tags = var.tags
}
```

### 7.6 Cost: $0/month (Consumption plan)

The Azure Functions Consumption plan includes 1 million free executions per month and 400,000 GB-seconds of compute. For Altaviz dev usage (~1,000 scoring calls/day), this stays well within the free tier.

---

## Phase 8: Governance & DevOps

### 8.1 Microsoft Purview (Data Governance)

Microsoft Purview provides data lineage, catalog, and compliance scanning for the Altaviz data estate. It automatically discovers and classifies data in OneLake, PostgreSQL, and Azure Storage.

**Create Purview Account:**

```bash
az purview account create \
  --name altaviz-purview \
  --resource-group altaviz-dev-rg \
  --location eastus

# Get the Purview portal URL
az purview account show \
  --name altaviz-purview \
  --resource-group altaviz-dev-rg \
  --query "endpoints.catalog" -o tsv
```

**Register Data Sources:**

1. Open the Purview governance portal (URL from above)
2. Go to **Data Map** > **Register**
3. Register these data sources:
   - **Azure Data Lake Storage Gen2** -- points to your OneLake storage account
   - **Azure SQL / PostgreSQL** -- points to the Altaviz database
   - **Azure Event Hubs** -- points to the telemetry namespace

**Configure Scans:**

1. For each registered source, click **New Scan**
2. Set scan frequency: Weekly (sufficient for dev)
3. Enable **Classification** to auto-detect PII, sensor data types
4. Run the initial scan

**View Lineage:**

After scanning, Purview shows data lineage from Bronze -> Silver -> Gold -> ML, letting you trace any prediction back to the raw sensor readings.

**Cost:** Free tier available (limited to 1 data source). Standard tier starts at ~$0.25/hour when scanning.

### 8.2 Azure DevOps

Azure DevOps provides CI/CD pipelines, artifact management, and work tracking.

**Setup:**

1. Go to [dev.azure.com](https://dev.azure.com) and create an organization
2. Create a new project named `altaviz`
3. Import repository from GitHub:
   - Go to **Repos** > **Import a repository**
   - Enter your GitHub repo URL
   - Authenticate with GitHub PAT

**Create CI Pipeline:**

Create `azure-pipelines.yml` in the repo root:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - docs/**
      - '*.md'

pool:
  vmImage: 'ubuntu-latest'

variables:
  pythonVersion: '3.12'

stages:
  - stage: Test
    displayName: 'Test & Validate'
    jobs:
      - job: UnitTests
        displayName: 'Unit Tests'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '$(pythonVersion)'

          - script: |
              python -m pip install --upgrade pip
              pip install -r requirements.txt
            displayName: 'Install dependencies'

          - script: pytest tests/unit/ -v --junitxml=test-results.xml
            displayName: 'Run unit tests'

          - task: PublishTestResults@2
            inputs:
              testResultsFiles: 'test-results.xml'
            condition: always()

      - job: AgentEval
        displayName: 'Agent Evaluation'
        dependsOn: UnitTests
        condition: succeeded()
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '$(pythonVersion)'

          - script: |
              pip install -r requirements.txt
              pytest tests/eval/ -v --junitxml=eval-results.xml
            displayName: 'Run agent evaluations'
            env:
              AZURE_OPENAI_ENDPOINT: $(AZURE_OPENAI_ENDPOINT)
              AZURE_OPENAI_API_KEY: $(AZURE_OPENAI_API_KEY)

  - stage: Deploy
    displayName: 'Deploy'
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: DeployFunctions
        displayName: 'Deploy Azure Functions'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '$(pythonVersion)'

          - task: AzureFunctionApp@2
            inputs:
              azureSubscription: 'altaviz-service-connection'
              appType: 'functionAppLinux'
              appName: 'altaviz-functions'
              package: 'functions/'
              runtimeStack: 'PYTHON|3.12'
```

**Set up secrets:**

Go to **Pipelines** > **Library** > **Variable groups** and add:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY` (mark as secret)
- `DATABASE_URL` (mark as secret)

**Cost:** Free for 5 users, 1 parallel job, unlimited private repos.

### 8.3 Power BI

Power BI connects directly to the OneLake Gold layer for fleet health dashboards.

**Setup:**

1. Download [Power BI Desktop](https://powerbi.microsoft.com/desktop/) (free)
2. Open Power BI Desktop
3. Click **Get Data** > **Azure** > **Azure Data Lake Storage Gen2**
4. Enter your OneLake endpoint:
   ```
   https://onelake.dfs.fabric.microsoft.com/<workspace-name>/lh_gold_curated
   ```
5. Authenticate with your Azure AD credentials
6. Select tables:
   - `fleet_health_hourly` -- compressor status over time
   - `alert_summary` -- alert counts by severity and region
   - `ml_predictions` -- anomaly scores, RUL, emissions

**Build Fleet Health Report:**

Create these visuals:
- **Map:** Station locations colored by health status (green/yellow/red)
- **KPI cards:** Total compressors, active alerts, avg anomaly score, fleet uptime %
- **Line chart:** Temperature trends by basin over 30 days
- **Bar chart:** Top 10 compressors by anomaly score
- **Table:** Open work orders with priority and status

**Publish to Power BI Service:**

1. Click **Publish** in Power BI Desktop
2. Select your workspace
3. Set up scheduled refresh (every 15 minutes from OneLake)

**Cost:** Power BI Desktop is free. Power BI Pro is $10/user/month for sharing. Power BI Premium starts at $20/user/month for large datasets.

---

## Phase 9: Additional Azure Services

### 9.1 Azure AI Foundry

Azure AI Foundry (formerly Azure AI Studio) is the unified portal for managing AI models, prompt engineering, and evaluation. It ties together Azure OpenAI, AI Search, and Content Safety.

**Setup:**

```bash
# Create an AI Foundry hub
az ml hub create \
  --name altaviz-ai-hub \
  --resource-group altaviz-dev-rg \
  --location eastus

# Create a project under the hub
az ml project create \
  --name altaviz-ai-project \
  --hub-name altaviz-ai-hub \
  --resource-group altaviz-dev-rg
```

**Link Azure OpenAI:**

1. Open [ai.azure.com](https://ai.azure.com)
2. Select your hub
3. Go to **Connected Resources** > **Add Connection**
4. Select your `altaviz-openai` resource

**Use Prompt Flow for Agent Evaluation:**

Prompt Flow provides a visual editor for building evaluation pipelines. This complements DeepEval by adding a no-code option for non-technical stakeholders.

1. Go to **Prompt Flow** > **Create**
2. Choose **Evaluation Flow**
3. Build a flow that:
   - Takes a compressor ID as input
   - Calls the agent API at `http://localhost:8001/diagnose`
   - Evaluates the response using built-in metrics (groundedness, relevance, coherence)
4. Run the evaluation against a test dataset

**Cost:** Free (uses your existing Azure OpenAI quota).

### 9.2 Azure Entra ID (Authentication & RBAC)

Azure Entra ID (formerly Azure AD) provides identity management for Altaviz users and service-to-service auth using managed identities.

**Configure RBAC for Users:**

```bash
# Create a custom role for Altaviz operators
az role definition create --role-definition '{
  "Name": "Altaviz Operator",
  "Description": "Can view dashboards, approve work orders, submit feedback",
  "Actions": [
    "Microsoft.CognitiveServices/accounts/deployments/read",
    "Microsoft.MachineLearningServices/workspaces/read"
  ],
  "AssignableScopes": ["/subscriptions/<your-sub-id>/resourceGroups/altaviz-dev-rg"]
}'

# Assign role to a user
az role assignment create \
  --assignee user@example.com \
  --role "Altaviz Operator" \
  --resource-group altaviz-dev-rg
```

**Configure Managed Identity for Service Auth:**

Instead of API keys, use managed identities for service-to-service authentication:

```bash
# Enable managed identity on the function app
az functionapp identity assign \
  --name altaviz-functions \
  --resource-group altaviz-dev-rg

# Get the identity's object ID
IDENTITY_ID=$(az functionapp identity show \
  --name altaviz-functions \
  --resource-group altaviz-dev-rg \
  --query "principalId" -o tsv)

# Grant the function app access to Azure OpenAI
az role assignment create \
  --assignee $IDENTITY_ID \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/<sub-id>/resourceGroups/altaviz-dev-rg/providers/Microsoft.CognitiveServices/accounts/altaviz-openai
```

Then update the code to use `DefaultAzureCredential` instead of API keys:

```python
from azure.identity import DefaultAzureCredential
import openai

credential = DefaultAzureCredential()
token = credential.get_token("https://cognitiveservices.azure.com/.default")

client = openai.AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_ad_token=token.token,
    api_version="2024-08-01-preview",
)
```

**Cost:** Free (included with Azure subscription).

### 9.3 Microsoft Defender for Cloud

Enable security scanning for the Altaviz deployment.

```bash
# Enable Defender for App Service (covers Functions)
az security pricing create \
  --name AppServices \
  --tier Standard

# Enable Defender for Key Vault
az security pricing create \
  --name KeyVaults \
  --tier Standard

# View security recommendations
az security assessment list \
  --resource-group altaviz-dev-rg \
  --query "[].{name:displayName, status:status.code}" \
  -o table
```

Key recommendations to act on:
- Enable diagnostic logging on all resources
- Configure private endpoints for Azure OpenAI and AI Search
- Enable Azure Key Vault soft delete and purge protection (already done in Terraform)
- Set up alerts for anomalous access patterns

**Cost:** Free tier available (limited recommendations). Standard tier: ~$15/server/month.

### 9.4 Azure Data Explorer (Kusto)

Azure Data Explorer (ADX) is optimized for time-series analytics at scale. Use it for real-time sensor telemetry analysis that goes beyond what the Gold layer aggregations provide.

**Create ADX Cluster:**

```bash
# Create a free cluster (dev/test only)
az kusto cluster create \
  --name altavizadx \
  --resource-group altaviz-dev-rg \
  --location eastus \
  --sku name="Dev(No SLA)_Standard_E2a_v4" tier="Basic" capacity=1

# Create a database
az kusto database create \
  --cluster-name altavizadx \
  --resource-group altaviz-dev-rg \
  --database-name telemetry \
  --soft-delete-period P365D \
  --hot-cache-period P31D
```

**Create Table and Ingestion:**

Connect to the ADX web UI at `https://dataexplorer.azure.com` and run:

```kql
// Create table matching the sensor reading schema
.create table SensorReadings (
    compressor_id: string,
    timestamp: datetime,
    vibration_mms: real,
    discharge_temp_f: real,
    suction_pressure_psi: real,
    discharge_pressure_psi: real,
    gas_flow_mcf: real,
    horsepower_pct: real,
    oil_pressure_psi: real,
    coolant_temp_f: real,
    rpm: int,
    station_id: string,
    region: string,
    ingestion_time: datetime
)

// Create ingestion mapping from Event Hubs
.create table SensorReadings ingestion json mapping "EventHubMapping"
    '[{"column":"compressor_id","path":"$.compressor_id","datatype":"string"},'
    '{"column":"timestamp","path":"$.timestamp","datatype":"datetime"},'
    '{"column":"vibration_mms","path":"$.vibration_mms","datatype":"real"},'
    '{"column":"discharge_temp_f","path":"$.discharge_temp_f","datatype":"real"},'
    '{"column":"suction_pressure_psi","path":"$.suction_pressure_psi","datatype":"real"},'
    '{"column":"discharge_pressure_psi","path":"$.discharge_pressure_psi","datatype":"real"},'
    '{"column":"gas_flow_mcf","path":"$.gas_flow_mcf","datatype":"real"},'
    '{"column":"horsepower_pct","path":"$.horsepower_pct","datatype":"real"},'
    '{"column":"station_id","path":"$.station_id","datatype":"string"},'
    '{"column":"region","path":"$.region","datatype":"string"}]'
```

**Example KQL Queries:**

```kql
// Top 10 compressors by vibration in the last 24 hours
SensorReadings
| where timestamp > ago(24h)
| summarize avg_vibration = avg(vibration_mms), max_vibration = max(vibration_mms)
    by compressor_id
| top 10 by max_vibration desc

// Detect sudden vibration spikes (4-sigma)
SensorReadings
| where timestamp > ago(7d)
| summarize avg_vib = avg(vibration_mms), std_vib = stdev(vibration_mms) by compressor_id
| join kind=inner (
    SensorReadings
    | where timestamp > ago(1h)
    | summarize latest_vib = avg(vibration_mms) by compressor_id
) on compressor_id
| where latest_vib > avg_vib + 4 * std_vib
| project compressor_id, latest_vib, avg_vib, std_vib, sigma = (latest_vib - avg_vib) / std_vib

// Temperature trend by basin
SensorReadings
| where timestamp > ago(30d)
| summarize avg_temp = avg(discharge_temp_f) by bin(timestamp, 1h), region
| render timechart
```

**Cost:** Dev/No SLA cluster is ~$0 (free trial eligible). Production starts at ~$200/month.

### 9.5 Copilot Studio

Copilot Studio enables the Operations team to build no-code conversational agents that connect to the Altaviz API.

**Setup:**

1. Go to [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com)
2. Create a new copilot named "Altaviz Operations Assistant"
3. Add these topics:

**Topic: Check Compressor Status**
- Trigger phrases: "How is COMP-0003?", "Check compressor status", "What is the vibration on COMP-XXX?"
- Action: HTTP request to `GET http://localhost:8001/diagnose`
- Response: Format the diagnostic report as a card

**Topic: Create Work Order**
- Trigger phrases: "Create work order for COMP-XXX", "Schedule maintenance"
- Action: HTTP request to `POST http://localhost:8001/work-orders/create`
- Response: Confirm work order ID and status

**Topic: Fleet Overview**
- Trigger phrases: "How is the fleet?", "Any alerts?", "Fleet health"
- Action: HTTP request to `POST http://localhost:8001/optimization/scan`
- Response: Summary of fleet health with active alerts

4. Publish to Microsoft Teams for the operations team

**Cost:** Free trial (60-day, 25 sessions). $200/month per 1,000 sessions after.

---

## Appendix A: Cost Calculator

| Service | Tier | Monthly Cost | Notes |
|---------|------|-------------|-------|
| Azure OpenAI (gpt-4o-mini) | PAYG | ~$5-10 | ~50 agent runs/day |
| Azure OpenAI (embeddings) | PAYG | ~$0.50 | ~20 embedding calls/day |
| Azure AI Search | Free | $0 | 50 MB, 3 indexes |
| Azure ML Workspace | Free | $0 | 10 GB storage |
| Azure Functions | Consumption | $0 | 1M free executions/mo |
| Azure DevOps | Free | $0 | 5 users |
| Langfuse Cloud | Free | $0 | 50K observations/mo |
| DeepEval | OSS | $0 | Unlimited local runs |
| LangGraph | OSS | $0 | Unlimited |
| Azure Data Explorer | Dev/No SLA | ~$0 | Free trial eligible |
| Microsoft Purview | Free | $0 | 1 data source |
| Power BI Desktop | Free | $0 | Desktop only |
| Azure Key Vault | Standard | ~$0.03 | Per 10K operations |
| Azure Log Analytics | PAYG | ~$2 | First 5 GB/mo free |
| **Total** | | **~$10-15/month** | |

Production scaling costs:
- Azure OpenAI at fleet scale (4,700 compressors): ~$50-100/month
- Azure AI Search Basic (50+ MB): $75/month
- Azure Functions at scale: still $0 (well under 1M executions)
- Power BI Pro (for sharing): $10/user/month

---

## Appendix B: Free Tier Limits

| Service | Free Tier | Limit | Upgrade Trigger |
|---------|-----------|-------|-----------------|
| Azure OpenAI | No free tier | PAYG from day 1 | N/A |
| Azure AI Search | Free | 50 MB storage, 3 indexes, 10K docs | >50 MB or >3 indexes |
| Azure ML | Free | 10 GB storage, unlimited experiments | >10 GB model artifacts |
| Azure Functions | Consumption | 1M executions/mo, 400K GB-sec | >1M executions/mo |
| Azure DevOps | Free | 5 users, 1 parallel job, unlimited repos | >5 users or need parallel jobs |
| Azure Key Vault | Standard | 10K ops/mo included | Negligible cost beyond |
| Azure Log Analytics | Free | 5 GB ingestion/mo | >5 GB logs/mo |
| Azure Data Explorer | Dev/No SLA | 1 cluster, no SLA | Need production SLA |
| Langfuse Cloud | Free | 50K observations/mo | >50K or need team features |
| DeepEval | OSS | Unlimited | N/A (fully open source) |
| LangGraph | OSS | Unlimited | N/A (fully open source) |
| Power BI Desktop | Free | Unlimited (local only) | Need to share reports |
| Microsoft Purview | Free | 1 data source | >1 data source |
| Copilot Studio | Trial | 25 sessions/60 days | After trial ends |

---

## Appendix C: Archrock Service Mapping

This table maps each Archrock JD requirement (data engineering, ML, and AI) to the Azure service that implements it and the corresponding Altaviz module.

| Archrock Requirement | Azure Service | Altaviz Module | Status |
|---------------------|---------------|----------------|--------|
| Real-time telemetry ingestion | Event Hubs | `src/ingestion/event_hub_consumer.py` | Production |
| Medallion architecture (Bronze/Silver/Gold) | OneLake + Delta Lake | `src/etl/pipeline.py` | Production |
| Data quality validation | Custom (PySpark) | `src/etl/silver/quality.py` | Production |
| Anomaly detection (vibration) | Azure ML + scikit-learn | `src/ml/anomaly_detector.py` | Production |
| Temperature drift prediction | Azure ML + scipy | `src/ml/temp_drift_predictor.py` | Production |
| Emissions compliance (EPA OOOOb) | Custom (rules-based) | `src/ml/emissions_estimator.py` | Production |
| Remaining Useful Life | Custom (heuristic) | `src/ml/rul_predictor.py` | Production |
| Feature store | Azure ML Feature Store | `src/ml/feature_store/store.py` | Production |
| Model registry + lifecycle | Azure ML + MLflow | `src/ml/serving/model_registry.py` | Production |
| Root cause analysis (AI agent) | Azure OpenAI + Pydantic AI | `src/agents/diagnostics_agent.py` | Production |
| Investigation with RAG | Azure AI Search + pgvector | `src/agents/investigation_agent.py` | Production |
| Work order automation (HITL) | LangGraph + Pydantic AI | `src/agents/work_order_agent.py` | Production |
| Fleet optimization copilot | Azure OpenAI + Pydantic AI | `src/agents/optimization_agent.py` | Production |
| Closed-loop autonomous maintenance | LangGraph | `src/agents/graph/workflow.py` | Phase 5 |
| Agent observability | Langfuse | `src/agents/shared/tracing.py` | Phase 3 |
| Agent evaluation | DeepEval | `tests/eval/` | Phase 4 |
| Real-time ML scoring | Azure Functions | `functions/function_app.py` | Phase 7 |
| Data lineage + governance | Microsoft Purview | (external service) | Phase 8 |
| CI/CD pipeline | Azure DevOps | `azure-pipelines.yml` | Phase 8 |
| BI dashboards | Power BI | (external tool) | Phase 8 |
| Infrastructure as code | Terraform | `infrastructure/terraform/` | Production |
| Secrets management | Azure Key Vault | `infrastructure/terraform/main.tf` | Production |
| Pipeline monitoring + alerting | Azure Monitor + Teams | `src/monitoring/metrics.py` | Production |
| Multi-tenant architecture | Azure Entra ID | `infrastructure/sql/schema.sql` | Production |

---

## Appendix D: Environment Variables Reference

Complete list of all environment variables needed for full integration across all 9 phases.

```bash
# ==============================================================================
# CORE: Azure Fabric (existing)
# ==============================================================================
FABRIC_WORKSPACE_ID=<workspace-guid>
FABRIC_BRONZE_LAKEHOUSE_ID=<lakehouse-guid>
FABRIC_SILVER_LAKEHOUSE_ID=<lakehouse-guid>
FABRIC_GOLD_LAKEHOUSE_ID=<lakehouse-guid>
FABRIC_ML_LAKEHOUSE_ID=<lakehouse-guid>

# ==============================================================================
# CORE: Azure Event Hubs (existing)
# ==============================================================================
EVENTHUB_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=...;EntityPath=compressor-telemetry
EVENTHUB_NAMESPACE=<namespace>
EVENTHUB_NAME=compressor-telemetry
EVENTHUB_CONSUMER_GROUP=$Default

# ==============================================================================
# CORE: Monitoring (existing)
# ==============================================================================
LOG_ANALYTICS_WORKSPACE_ID=<workspace-guid>
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# ==============================================================================
# CORE: Database (existing)
# ==============================================================================
DATABASE_URL=postgresql://user:pass@host:5432/altaviz
ETL_ORGANIZATION_ID=<org-uuid>

# ==============================================================================
# PHASE 1: Azure OpenAI
# ==============================================================================
AZURE_OPENAI_ENDPOINT=https://altaviz-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini

# Legacy (remove after Phase 1 migration)
# OPENAI_API_KEY=sk-...

# ==============================================================================
# PHASE 2: Azure AI Search
# ==============================================================================
AZURE_SEARCH_ENDPOINT=https://altaviz-search.search.windows.net
AZURE_SEARCH_API_KEY=<admin-key>
AZURE_SEARCH_INDEX=altaviz-knowledge-base
SEARCH_BACKEND=azure  # or "pgvector"

# ==============================================================================
# PHASE 3: Langfuse
# ==============================================================================
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com  # or http://localhost:3001

# ==============================================================================
# PHASE 4: DeepEval
# ==============================================================================
DEEPEVAL_API_KEY=<optional-for-cloud-dashboard>

# ==============================================================================
# PHASE 6: Azure ML
# ==============================================================================
MLFLOW_TRACKING_URI=azureml://eastus.api.azureml.ms/mlflow/v1.0/subscriptions/<sub-id>/resourceGroups/altaviz-dev-rg/providers/Microsoft.MachineLearningServices/workspaces/altaviz-ml

# ==============================================================================
# PHASE 9: Azure AI Foundry (optional)
# ==============================================================================
AZURE_AI_HUB_NAME=altaviz-ai-hub
AZURE_AI_PROJECT_NAME=altaviz-ai-project
```

**Security notes:**
- Never commit `.env` files to version control (already in `.gitignore`)
- For production, store all secrets in Azure Key Vault
- Use managed identities instead of API keys where possible (Phase 9.2)
- Rotate API keys every 90 days
- The `AZURE_OPENAI_API_KEY` and `AZURE_SEARCH_API_KEY` should be stored in Key Vault and retrieved at runtime using `az keyvault secret show` or the Azure SDK
