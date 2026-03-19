# =============================================================================
# Azure Machine Learning Workspace
# =============================================================================
# WHY: The ML workspace is the control plane for all 4 ML models (anomaly
#      detection, temp drift, emissions, RUL). It hosts:
#      - MLflow Tracking Server: experiment runs, metrics, parameters
#      - Model Registry: versioned model artifacts with stage promotion
#      - Compute Targets: training and batch inference (optional)
#
# SCALING: At Archrock scale, the ML workspace stores ~50 experiment runs
#          and 4 registered models. Storage is minimal (<1 GB). The real
#          compute happens in Spark (PySpark batch inference), not in the
#          ML workspace — the workspace is primarily a registry.
# =============================================================================

# =============================================================================
# PATTERN: Triple Dependency (App Insights + Key Vault + Storage)
# WHY: Azure ML workspace requires all 3 dependencies at creation time:
#
#   application_insights_id: Every experiment run logs metrics (accuracy,
#      loss, inference latency) to App Insights. This enables monitoring
#      model performance in production and detecting model drift. Without
#      App Insights, you lose experiment telemetry.
#
#   key_vault_id: The workspace stores sensitive config (database connection
#      strings, API keys for external services) in Key Vault. MLflow also
#      uses Key Vault for model signing secrets. Without Key Vault, secrets
#      would need to be passed via environment variables (less secure).
#
#   storage_account_id: Model artifacts (serialized sklearn models, feature
#      schemas, training data snapshots) are stored in Azure Blob Storage.
#      MLflow's artifact store maps to a blob container. Without Storage,
#      there's nowhere to persist model files.
#
# NOTE: All 3 resources are defined in other .tf files (main.tf for storage,
#       monitoring.tf for App Insights, main.tf for Key Vault). Terraform
#       resolves the dependency graph automatically.
# =============================================================================

# =============================================================================
# PATTERN: SystemAssigned Managed Identity
# WHY: The ML workspace needs to:
#   - Read/write model artifacts in the Storage Account
#   - Read secrets from Key Vault
#   - Write telemetry to App Insights
#   - Pull container images for compute targets
#   SystemAssigned identity creates an Azure AD service principal tied to
#   this workspace's lifecycle. When the workspace is deleted, the identity
#   is automatically cleaned up (no orphaned credentials).
# ALTERNATIVE: UserAssigned identity lets you share one identity across
#   multiple resources, but adds management overhead. SystemAssigned is
#   simpler for single-purpose resources.
# =============================================================================

resource "azurerm_machine_learning_workspace" "main" {
  name                    = "${var.project_name}-ml-${var.environment}"
  location                = var.location
  resource_group_name     = azurerm_resource_group.main.name
  application_insights_id = azurerm_application_insights.main.id
  key_vault_id            = azurerm_key_vault.main.id
  storage_account_id      = azurerm_storage_account.main.id

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}
