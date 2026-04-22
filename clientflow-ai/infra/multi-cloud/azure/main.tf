terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "clientflow-ai-tfstate-rg"
    storage_account_name = "clientflowtfstate"
    container_name       = "tfstate"
    key                  = "azure/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  default = "eastus"
}

variable "app_name" {
  default = "clientflow-ai"
}

variable "db_admin_password" {
  sensitive = true
}

# ─── RESOURCE GROUP ─────────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "${var.app_name}-rg"
  location = var.location
}

# ─── APP SERVICE PLAN ────────────────────────────────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "P2v3"
}

# ─── APP SERVICE ─────────────────────────────────────────────────────────────────
resource "azurerm_linux_web_app" "backend" {
  name                = "${var.app_name}-backend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
    application_stack {
      node_version = "18-lts"
    }
    health_check_path = "/api/monitoring/health"
  }

  app_settings = {
    NODE_ENV              = "production"
    PORT                  = "5000"
    WEBSITES_PORT         = "5000"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
  }

  logs {
    http_logs {
      retention_in_days = 7
    }
    application_logs {
      file_system_level = "Warning"
    }
  }
}

resource "azurerm_linux_web_app_slot" "staging" {
  name           = "staging"
  app_id         = azurerm_linux_web_app.backend.id
  service_plan_id = azurerm_service_plan.main.id

  site_config {
    always_on = false
    application_stack { node_version = "18-lts" }
  }
}

# ─── AZURE DATABASE FOR POSTGRESQL ──────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.app_name}-db"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = "clientflow"
  administrator_password = var.db_admin_password
  sku_name               = "GP_Standard_D2s_v3"
  storage_mb             = 32768
  backup_retention_days  = 7
  geo_redundant_backup_enabled = true
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }
  zone = "1"
}

resource "azurerm_postgresql_flexible_server_database" "clientflow" {
  name      = "clientflow"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "app" {
  name             = "allow-app-service"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ─── AZURE FRONT DOOR ────────────────────────────────────────────────────────────
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.app_name}-frontdoor"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.app_name}-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "${var.app_name}-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false
  health_probe {
    interval_in_seconds = 30
    path                = "/api/monitoring/health"
    protocol            = "Https"
    request_type        = "GET"
  }
  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "app_service" {
  name                          = "${var.app_name}-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                       = true
  host_name                     = azurerm_linux_web_app.backend.default_hostname
  https_port                    = 443
  http_port                     = 80
  origin_host_header            = azurerm_linux_web_app.backend.default_hostname
  priority                      = 1
  weight                        = 1000
}

resource "azurerm_cdn_frontdoor_route" "main" {
  name                          = "default-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.app_service.id]
  enabled                       = true
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  patterns_to_match             = ["/*"]
  supported_protocols           = ["Http", "Https"]
  link_to_default_domain        = true
}

output "app_service_url"  { value = "https://${azurerm_linux_web_app.backend.default_hostname}" }
output "front_door_url"   { value = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}" }
output "db_server"        { value = azurerm_postgresql_flexible_server.main.fqdn }
