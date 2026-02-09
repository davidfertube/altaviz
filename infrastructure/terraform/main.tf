terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Use partial backend config — pass -backend-config=envs/<env>.tfbackend
  # Example: terraform init -backend-config=envs/prod.tfbackend
  backend "azurerm" {
    resource_group_name  = "altaviz-terraform"
    storage_account_name = "altavizterraform"
    container_name       = "tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location
  tags     = var.tags
}
