# =============================================================================
# Azure AI Services — OpenAI + AI Search
# =============================================================================
# WHY: These services power the 4 AI agents (diagnostics, investigation,
#      work order, optimization). Azure OpenAI hosts the LLM (gpt-4o-mini)
#      and embedding model (text-embedding-3-small). Azure AI Search provides
#      the vector index for RAG-based knowledge base retrieval.
# =============================================================================

# =============================================================================
# PATTERN: Azure Cognitive Account with kind="OpenAI"
# WHY: Azure hosts OpenAI models through its Cognitive Services platform.
#      The kind="OpenAI" tells Azure to provision an OpenAI-compatible
#      endpoint. This is NOT the same as using OpenAI directly — it runs
#      on Azure infrastructure, which means:
#      - Data stays in your Azure region (data residency compliance)
#      - Managed Identity authentication (no API keys in production)
#      - Azure Monitor integration (cost tracking, rate limit alerts)
#      - Enterprise SLA (99.9% uptime)
#
# SKU "S0": Standard tier, pay-as-you-go. This is the only SKU available
#      for Azure OpenAI. Billing is per-token (not per-request).
#      At Archrock scale (~200 LLM calls/day), cost is ~$5-10/day.
#
# PATTERN: SystemAssigned Managed Identity
# WHY: Enables the OpenAI service to authenticate with other Azure services
#      (Key Vault, Storage) without API keys. In production, the Function App
#      and Container App use their own Managed Identities to call this
#      OpenAI endpoint — no AZURE_OPENAI_API_KEY needed in app_settings.
#      The Key Vault secret below is a fallback for local development.
# =============================================================================

# Azure OpenAI Service
resource "azurerm_cognitive_account" "openai" {
  name                = "${var.project_name}-openai-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "OpenAI"
  sku_name            = "S0"

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

# =============================================================================
# PATTERN: Model Deployments with Token Capacity
# WHY: Azure OpenAI requires explicit "deployments" for each model you use.
#      A deployment maps a model name + version to a capacity allocation.
#      capacity=10 means 10K tokens per minute (TPM). This is sufficient
#      for dev/staging (~200 calls/day). For production, increase to 30-60
#      to handle burst traffic (e.g., fleet scan triggering 50 investigations).
#
# NAMING: Deployment name matches the model name ("gpt-4o-mini") for
#         simplicity. The config/azure_ai.yaml references these names
#         via ${AZURE_OPENAI_DEPLOYMENT}.
# =============================================================================

# GPT-4o-mini deployment (for agents)
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
    capacity = 10 # 10K tokens per minute
  }
}

# Text embedding deployment (for RAG)
# text-embedding-3-small produces 1536-dimensional vectors, matching the
# vector_dimensions setting in config/azure_ai.yaml and the pgvector
# column definition in infrastructure/sql/schema.sql.
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

# =============================================================================
# PATTERN: Azure AI Search (Free Tier)
# WHY: AI Search provides the vector index for RAG knowledge base retrieval.
#      The investigation agent embeds a query, searches for similar past
#      incidents, and includes them as context for root cause analysis.
#
# FREE SKU LIMITATIONS:
#   - 50 MB storage (enough for ~5,000 knowledge base documents)
#   - 3 indexes max (we use 1: "altaviz-knowledge-base")
#   - No semantic ranking (hybrid search only, no reranker)
#   - No SLA (best effort)
#   For production: upgrade to "basic" ($75/mo) for semantic ranking
#   and 2 GB storage, or "standard" for geo-replication.
#
# ALTERNATIVE: pgvector (already in the PostgreSQL schema) can also do
#   vector similarity search. AI Search adds: hybrid search (keyword +
#   vector), semantic ranking, and a managed index lifecycle. For small
#   knowledge bases (<1,000 docs), pgvector alone may be sufficient.
# =============================================================================

# Azure AI Search Service (Free tier)
resource "azurerm_search_service" "main" {
  name                = "${var.project_name}-search-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "free"

  tags = local.tags
}

# =============================================================================
# PATTERN: Key Vault Secret Storage
# WHY: API keys for OpenAI and AI Search are stored in Key Vault, not in
#      environment variables or code. The Function App and Container App
#      reference these secrets via @Microsoft.KeyVault(SecretUri=...) syntax
#      in their app_settings. This means:
#      - Secrets rotate without redeploying apps
#      - Audit log of every secret access
#      - No secrets in Terraform state (marked sensitive in outputs)
#      In production with Managed Identity, these secrets are a fallback —
#      apps authenticate directly via DefaultAzureCredential.
# =============================================================================

# Store Azure OpenAI key in Key Vault
resource "azurerm_key_vault_secret" "openai_key" {
  name         = "azure-openai-api-key"
  value        = azurerm_cognitive_account.openai.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# Store AI Search key in Key Vault
resource "azurerm_key_vault_secret" "search_key" {
  name         = "azure-search-api-key"
  value        = azurerm_search_service.main.primary_key
  key_vault_id = azurerm_key_vault.main.id
}
