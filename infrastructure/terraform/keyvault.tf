data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-${var.environment}-kv"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
  tags                       = var.tags

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge",
    ]
  }
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_admin_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "nextauth_secret" {
  name         = "nextauth-secret"
  value        = var.nextauth_secret
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "stripe_secret_key" {
  name         = "stripe-secret-key"
  value        = var.stripe_secret_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "stripe_webhook_secret" {
  name         = "stripe-webhook-secret"
  value        = var.stripe_webhook_secret
  key_vault_id = azurerm_key_vault.main.id
}
