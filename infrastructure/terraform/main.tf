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

# ---------------------------------------------------------------------------
# PATTERN: Provider Pinning with Pessimistic Constraint (~>)
# WHY: ~> 4.0 allows 4.x but not 5.0. This prevents breaking changes from
#      major version bumps while allowing minor/patch updates (bug fixes,
#      new resource support). azapi is used for Fabric resources that the
#      azurerm provider doesn't support yet (Fabric is relatively new).
# ---------------------------------------------------------------------------

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

  # ---------------------------------------------------------------------------
  # PATTERN: Remote State in Azure Blob Storage
  # WHY: Terraform state contains all resource IDs, secrets, and dependency
  #      graphs. Storing it locally risks: data loss (laptop crash), state
  #      conflicts (two engineers applying simultaneously), and secret
  #      exposure (state file contains Key Vault secret values in plaintext).
  #      Azure Blob backend provides: locking (via blob lease), encryption
  #      at rest, versioning, and shared access across the team.
  # ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# PATTERN: Region Selection — Co-located with Customer HQ
# WHY: southcentralus (San Antonio, TX) is the closest Azure region to
#      Archrock's headquarters in Houston, TX. Co-location minimizes
#      latency for the dashboard UI and API calls. It also keeps data
#      in the same regulatory jurisdiction (important for EPA compliance).
# ALTERNATIVE: eastus2 has more capacity and sometimes lower pricing,
#      but adds ~20ms latency for Houston-based users.
# ---------------------------------------------------------------------------
variable "location" {
  description = "Azure region (co-located with Archrock HQ)"
  type        = string
  default     = "southcentralus"
}

# ---------------------------------------------------------------------------
# PATTERN: Tags for Cost Allocation and Resource Discovery
# WHY: Every Azure resource gets these tags. This enables:
#   - Cost allocation: filter Azure Cost Management by project/team
#   - Resource discovery: find all resources for this project
#   - Automation: scripts can target resources by tag
#   - Compliance: auditors can verify managed_by=terraform
#   fleet_size="4700" is informational — helps ops understand the scale
#   of the workload when investigating resource utilization.
# ---------------------------------------------------------------------------
variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    project     = "altaviz"
    managed_by  = "terraform"
    fleet_size  = "4700"
  }
}

# ---------------------------------------------------------------------------
# PATTERN: Naming Convention via locals
# WHY: The prefix "${project_name}-${environment}" (e.g., "altaviz-prod")
#      is prepended to every resource name. This ensures:
#      - No naming collisions between environments (dev vs prod)
#      - Easy identification of resources in the Azure portal
#      - Consistent naming across all .tf files (ai_services.tf,
#        functions.tf, etc. all reference local.prefix)
# ---------------------------------------------------------------------------
locals {
  prefix = "${var.project_name}-${var.environment}"
}

# ============================================================================
# RESOURCE GROUP
# ============================================================================
# All Altaviz resources live in a single resource group. This simplifies:
# - RBAC: grant access to the entire project with one role assignment
# - Cost tracking: one resource group = one cost center
# - Cleanup: delete the resource group to remove everything
# In larger orgs, you might split into separate groups (e.g., rg-data,
# rg-compute, rg-network), but for Altaviz the single-group model is simpler.

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

# ===========================================================================
# PATTERN: Namespace + Hub Design
# WHY: In Azure Event Hubs, a NAMESPACE is the billing and networking unit
#      (like a Kafka cluster), and a HUB is a topic within it. You can have
#      multiple hubs in one namespace, sharing the throughput units (TUs).
#      Altaviz uses one namespace with one hub ("compressor-telemetry")
#      because all telemetry has the same schema and processing pipeline.
#      If we added a second data stream (e.g., "maintenance-events"), it
#      would be a second hub in the same namespace.
#
# CAPACITY: 2 Throughput Units (TUs)
#   - 1 TU = 1 MB/sec ingress + 2 MB/sec egress + 1,000 events/sec
#   - 4,700 compressors x 12 msg/hr = 56,400 msg/hr = ~16 msg/sec
#   - Each message is ~500 bytes, so ingress is ~8 KB/sec
#   - 1 TU is more than enough; 2 TUs provide headroom for batch replays
# ===========================================================================

resource "azurerm_eventhub_namespace" "telemetry" {
  name                = "ehns-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  capacity            = 2

  tags = var.tags
}

# ===========================================================================
# PATTERN: 16 Partitions for Parallel Consumption
# WHY: Each partition is an ordered, immutable sequence of events. The
#      partition count determines the maximum parallelism of consumers:
#      - 16 partitions ~= 10 basins + headroom for hot basins
#      - The fleet simulator partitions by basin (e.g., Permian, Eagle Ford)
#      - Each Spark executor reads from 1+ partitions in parallel
#      - Cannot be changed after creation (must recreate the hub)
#
# message_retention = 7: Keep events for 7 days. This allows:
#      - Reprocessing after pipeline bugs (replay from 7 days ago)
#      - Late-arriving data handling (compressors with connectivity issues)
# ===========================================================================

resource "azurerm_eventhub" "compressor_telemetry" {
  name              = "compressor-telemetry"
  namespace_id      = azurerm_eventhub_namespace.telemetry.id
  partition_count   = 16
  message_retention = 7
}

# ===========================================================================
# PATTERN: Dedicated Consumer Groups
# WHY: Consumer groups enable independent readers on the same Event Hub.
#      Each group maintains its own read offset (position in the stream).
#   etl-pipeline: Main Bronze ingestion (Spark Structured Streaming)
#   ml-inference: Separate consumer for real-time ML scoring
#      If ML inference falls behind, it doesn't slow down Bronze ingestion.
# ===========================================================================

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

# Key Vault stores all secrets (Event Hub connection strings, OpenAI API
# keys, database passwords) in a single audited, encrypted store.
# purge_protection_enabled: prevents accidental permanent deletion
# soft_delete_retention_days=7: minimum retention for compliance

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

# SKU "PerGB2018": Pay-per-GB ingestion (~$2.76/GB). At Archrock scale,
# pipeline logs generate ~100 MB/day = ~$0.28/day.
# retention_in_days = 90: First 31 days free; 32-90 cost ~$0.10/GB/month.

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

# General-purpose storage for non-lakehouse data:
# - checkpoints: Spark Structured Streaming checkpoint files (offsets)
# - ml-artifacts: MLflow model artifacts, feature store snapshots
# LRS: 3 copies within one datacenter (cheapest; sufficient for
#   regeneratable checkpoints and versioned ML artifacts)
# NAMING: Storage account names must be globally unique, 3-24 chars,
#   lowercase alphanumeric only. replace() strips hyphens from prefix.

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
# These outputs are consumed by:
# - CI/CD pipelines (to configure the ETL pipeline and agent API)
# - Other Terraform modules (if this is used as a module)
# - terraform output commands for debugging

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
