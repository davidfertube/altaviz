# ============================================================================
# ALTAVIZ PRODUCTION INFRASTRUCTURE — Azure Fabric + Event Hubs
# ============================================================================
# Provisions all Azure resources for 4,700 compressor monitoring platform.
#
# Resources:
# - Resource Group
# - Event Hubs Namespace (IoT ingestion)
# - Key Vault (secrets management)
# - Log Analytics Workspace (monitoring)
# - Storage Account (checkpoints, artifacts)
# - Fabric Workspace + Lakehouses (provisioned via Fabric REST API)
#
# Usage:
#   cd infrastructure/terraform
#   terraform init -backend-config=envs/prod.tfbackend
#   terraform plan -var-file=environments/prod.tfvars
#   terraform apply -var-file=environments/prod.tfvars
# ============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.12"
    }
  }

  backend "azurerm" {
    resource_group_name  = "altaviz-terraform"
    storage_account_name = "altavizterraform"
    container_name       = "tfstate"
  }
}

provider "azurerm" {
  features {}
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "altaviz"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region (co-located with Archrock HQ)"
  type        = string
  default     = "southcentralus"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    project     = "altaviz"
    managed_by  = "terraform"
    fleet_size  = "4700"
  }
}

locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ============================================================================
# RESOURCE GROUP
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = "${local.prefix}-rg"
  location = var.location
  tags     = var.tags
}

# ============================================================================
# EVENT HUBS (IoT Ingestion)
# ============================================================================
# 4,700 compressors x 12 msg/hr = 56,400 msg/hr = ~16 msg/sec
# 1 Throughput Unit handles 1 MB/sec or 1,000 msg/sec
# Using 2 TUs for headroom during batch replays

resource "azurerm_eventhub_namespace" "telemetry" {
  name                = "ehns-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  capacity            = 2

  tags = var.tags
}

resource "azurerm_eventhub" "compressor_telemetry" {
  name              = "compressor-telemetry"
  namespace_id      = azurerm_eventhub_namespace.telemetry.id
  partition_count   = 16
  message_retention = 7
}

resource "azurerm_eventhub_consumer_group" "etl_pipeline" {
  name         = "etl-pipeline"
  namespace_id = azurerm_eventhub_namespace.telemetry.id
  eventhub_id  = azurerm_eventhub.compressor_telemetry.id
}

resource "azurerm_eventhub_consumer_group" "ml_inference" {
  name         = "ml-inference"
  namespace_id = azurerm_eventhub_namespace.telemetry.id
  eventhub_id  = azurerm_eventhub.compressor_telemetry.id
}

# ============================================================================
# KEY VAULT (Secrets Management)
# ============================================================================

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.prefix}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  tags = var.tags
}

resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
}

resource "azurerm_key_vault_secret" "eventhub_connection" {
  name         = "eventhub-connection-string"
  value        = azurerm_eventhub_namespace.telemetry.default_primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================================================
# LOG ANALYTICS (Monitoring)
# ============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = var.tags
}

# ============================================================================
# STORAGE ACCOUNT (Checkpoints, ML Artifacts)
# ============================================================================

resource "azurerm_storage_account" "pipeline" {
  name                     = replace("st${local.prefix}", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = var.tags
}

resource "azurerm_storage_container" "checkpoints" {
  name                 = "checkpoints"
  storage_account_id   = azurerm_storage_account.pipeline.id
}

resource "azurerm_storage_container" "ml_artifacts" {
  name                 = "ml-artifacts"
  storage_account_id   = azurerm_storage_account.pipeline.id
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "eventhub_namespace" {
  value = azurerm_eventhub_namespace.telemetry.name
}

output "eventhub_connection_string" {
  value     = azurerm_eventhub_namespace.telemetry.default_primary_connection_string
  sensitive = true
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.main.workspace_id
}

output "storage_account_name" {
  value = azurerm_storage_account.pipeline.name
}
