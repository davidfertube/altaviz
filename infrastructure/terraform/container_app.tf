resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-${var.environment}-env"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = var.tags
}

resource "azurerm_container_app" "frontend" {
  name                         = "${var.project_name}-frontend"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type = "SystemAssigned"
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = "System"
  }

  secret {
    name  = "db-connection"
    value = "postgresql://${var.db_admin_username}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/compressor_health?sslmode=require"
  }

  secret {
    name  = "nextauth-secret"
    value = var.nextauth_secret
  }

  secret {
    name  = "stripe-secret-key"
    value = var.stripe_secret_key
  }

  secret {
    name  = "stripe-webhook-secret"
    value = var.stripe_webhook_secret
  }

  template {
    min_replicas = 1
    max_replicas = 5

    container {
      name   = "frontend"
      image  = var.container_image != "" ? var.container_image : "${azurerm_container_registry.main.login_server}/${var.project_name}-frontend:latest"
      cpu    = 0.5
      memory = "2Gi"

      env {
        name  = "DB_HOST"
        value = azurerm_postgresql_flexible_server.main.fqdn
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_NAME"
        value = "compressor_health"
      }
      env {
        name  = "DB_USER"
        value = var.db_admin_username
      }
      env {
        name        = "DB_PASSWORD"
        secret_name = "db-connection"
      }
      env {
        name        = "AUTH_SECRET"
        secret_name = "nextauth-secret"
      }
      env {
        name  = "AUTH_TRUST_HOST"
        value = "true"
      }
      env {
        name  = "AZURE_AD_CLIENT_ID"
        value = var.azure_ad_client_id
      }
      env {
        name  = "AZURE_AD_TENANT_ID"
        value = var.azure_ad_tenant_id
      }
      env {
        name        = "STRIPE_SECRET_KEY"
        secret_name = "stripe-secret-key"
      }
      env {
        name        = "STRIPE_WEBHOOK_SECRET"
        secret_name = "stripe-webhook-secret"
      }
      env {
        name  = "STRIPE_PRICE_ID_PRO"
        value = var.stripe_price_id_pro
      }
      env {
        name  = "STRIPE_PRICE_ID_ENTERPRISE"
        value = var.stripe_price_id_enterprise
      }
      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.main.connection_string
      }
    }

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "50"
    }
  }

  ingress {
    target_port      = 3000
    external_enabled = true

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
