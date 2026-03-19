# =============================================================================
# Microsoft Purview — Data Governance & Catalog
# =============================================================================
# WHY: Purview provides three capabilities critical for regulated industries:
#
#   1. DATA CATALOG: Automatically discovers and classifies data assets
#      across the Altaviz lakehouse (Bronze, Silver, Gold, ML tables).
#      Data engineers and analysts can search for tables by name, schema,
#      or business meaning without knowing the exact OneLake path.
#
#   2. DATA LINEAGE: Tracks how data flows from IoT sensors through the
#      Bronze -> Silver -> Gold -> ML pipeline. If a Gold-layer metric
#      looks wrong, lineage shows exactly which Silver transforms and
#      Bronze sources contributed to it. At Archrock scale (4,700
#      compressors, 20+ tables), manual lineage tracking is infeasible.
#
#   3. DATA GOVERNANCE: Classifies sensitive fields (GPS coordinates,
#      organization IDs), enforces access policies, and generates
#      compliance reports. Important for EPA OOOOb emissions reporting
#      where data provenance must be auditable.
#
# PATTERN: Separate from Core Infrastructure
# WHY: Purview is optional and compliance-driven. Not every environment
#      needs it (dev certainly doesn't). By keeping it in its own .tf file,
#      you can exclude it from dev/staging by not including this file in
#      the terraform plan, or by wrapping it in a count/for_each conditional:
#        count = var.enable_purview ? 1 : 0
#
# SCALING: Purview pricing is based on data map capacity units. The free
#      tier (included with Azure subscription) provides basic scanning.
#      For Archrock's 4,700 compressor fleet, the Standard tier (~$0.40/hr
#      per capacity unit) is needed for automated scanning schedules.
#
# ALTERNATIVE: Could rely solely on Delta Lake's built-in schema evolution
#      and time travel for lineage, but that only covers the Delta tables —
#      not Event Hubs, Key Vault, or external data sources. Purview
#      provides end-to-end lineage across all Azure services.
# =============================================================================

resource "azurerm_purview_account" "main" {
  name                = "${var.project_name}-purview-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  # SystemAssigned identity enables Purview to scan data sources (OneLake,
  # Event Hubs, SQL endpoints) without storing credentials. The identity
  # needs Reader + Storage Blob Data Reader roles on each data source.
  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}
