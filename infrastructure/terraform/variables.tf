variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "altaviz"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "South Central US"
}

variable "db_admin_username" {
  description = "PostgreSQL admin username"
  type        = string
  sensitive   = true
}

variable "db_admin_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "Docker image for the frontend app"
  type        = string
  default     = ""
}

variable "nextauth_secret" {
  description = "NextAuth.js secret key"
  type        = string
  sensitive   = true
}

variable "github_client_id" {
  description = "GitHub OAuth application client ID"
  type        = string
  default     = ""
}

variable "github_client_secret" {
  description = "GitHub OAuth application client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_id_pro" {
  description = "Stripe price ID for Pro plan"
  type        = string
  default     = ""
}

variable "stripe_price_id_enterprise" {
  description = "Stripe price ID for Enterprise plan"
  type        = string
  default     = ""
}

variable "workflow_api_key" {
  description = "API key for agentic workflow cron/scheduler authentication"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    project     = "altaviz"
    managed_by  = "terraform"
    environment = "prod"
    cost_center = "engineering"
    owner       = "platform-team"
  }
}
