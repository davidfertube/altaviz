# =============================================================================
# Azure Functions — Serverless Model Scoring
# =============================================================================
# WHY: Azure Functions handles lightweight, event-driven workloads that
#      don't need a persistent server: on-demand model scoring, webhook
#      handlers, scheduled maintenance checks. This complements the
#      Container App (which runs the FastAPI agent sidecar continuously).
#
# PATTERN: Functions vs Container App (different scaling models)
# WHY SEPARATE: The agent API (Container App) needs persistent connections
#      (WebSocket for chat, long-running LLM calls) and always-on instances.
#      Functions are for short-lived, bursty workloads (score a single
#      prediction in <10 seconds). Using Functions for agents would hit
#      cold-start latency (5-15s) and the 5-minute timeout. Using Container
#      App for simple scoring would waste money on idle compute.
# =============================================================================

# =============================================================================
# PATTERN: Consumption Plan (Y1 SKU) — Serverless, Pay-Per-Execution
# WHY: Y1 is Azure's serverless plan:
#   - Scales to zero: no cost when idle (unlike App Service which runs 24/7)
#   - Auto-scales up: handles burst traffic (e.g., batch scoring 4,700
#     compressors triggers 4,700 function invocations)
#   - Free tier: 1M executions/month + 400K GB-seconds included
#   - Max execution time: 5 minutes (sufficient for model scoring)
#
# TRADEOFF: Cold start latency (5-15s for Python) on first invocation
#   after idle period. For latency-sensitive workloads, use Premium plan
#   (EP1) which keeps 1 instance warm.
#
# SCALING: At Archrock scale, batch scoring runs ~4 times/day (once per
#   6-hour window). Each run scores 4,700 compressors x 4 models = 18,800
#   invocations. Well within free tier (1M/month = ~33K/day).
# =============================================================================

# Service plan (Consumption — free tier: 1M executions/month)
resource "azurerm_service_plan" "functions" {
  name                = "${var.project_name}-func-plan-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan

  tags = local.tags
}

# =============================================================================
# PATTERN: Python 3.11 Runtime
# WHY: Azure Functions supports Python 3.9, 3.10, and 3.11. We use 3.11
#      (latest stable supported) for:
#      - 10-25% faster execution (CPython 3.11 performance improvements)
#      - Better error messages (fine-grained tracebacks)
#      - typing improvements used by Pydantic models
#      Python 3.12+ is not yet supported by Azure Functions as of 2026.
# =============================================================================

# =============================================================================
# PATTERN: @Microsoft.KeyVault Secret References
# WHY: The app_settings use @Microsoft.KeyVault(SecretUri=...) syntax to
#      reference secrets stored in Azure Key Vault. At runtime, Azure
#      Functions automatically resolves these references and injects the
#      secret value as an environment variable. This means:
#      - Secrets never appear in Terraform state or app config
#      - Secret rotation in Key Vault takes effect without redeployment
#      - The Function App's Managed Identity must have "Get" permission
#        on the Key Vault (configured via access policy)
# PREREQUISITE: The Function App's SystemAssigned identity needs a Key Vault
#      access policy granting Secret "Get" permission. This is typically
#      added in a separate azurerm_key_vault_access_policy resource.
# =============================================================================

# Function App
resource "azurerm_linux_function_app" "main" {
  name                = "${var.project_name}-functions-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.functions.id

  site_config {
    application_stack {
      python_version = "3.11"
    }

    application_insights_connection_string = azurerm_application_insights.main.connection_string
    application_insights_key               = azurerm_application_insights.main.instrumentation_key
  }

  app_settings = {
    "AZURE_OPENAI_ENDPOINT" = azurerm_cognitive_account.openai.endpoint
    "AZURE_OPENAI_API_KEY"  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.openai_key.id})"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}
