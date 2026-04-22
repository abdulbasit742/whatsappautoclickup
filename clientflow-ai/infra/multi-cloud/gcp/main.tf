terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "clientflow-ai-tfstate-gcp"
    prefix = "gcp/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
}

variable "region" {
  default = "us-central1"
}

variable "app_name" {
  default = "clientflow-ai"
}

variable "db_password" {
  sensitive = true
}

# ─── CLOUD RUN ──────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.app_name}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.project_id}/${var.app_name}:latest"
      ports { container_port = 5000 }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "5000"
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── CLOUD SQL ──────────────────────────────────────────────────────────────────
resource "google_sql_database_instance" "postgres" {
  name             = "${var.app_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-n1-standard-1"
    availability_type = "REGIONAL"

    backup_configuration {
      enabled            = true
      start_time         = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "clientflow" {
  name     = "clientflow"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "clientflow" {
  name     = "clientflow"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ─── VPC ────────────────────────────────────────────────────────────────────────
resource "google_compute_network" "main" {
  name                    = "${var.app_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "${var.app_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_compute_global_address" "private_ip" {
  name          = "${var.app_name}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

# ─── LOAD BALANCER ──────────────────────────────────────────────────────────────
resource "google_compute_global_forwarding_rule" "https" {
  name       = "${var.app_name}-forwarding-rule"
  target     = google_compute_target_https_proxy.main.id
  port_range = "443"
}

resource "google_compute_target_https_proxy" "main" {
  name    = "${var.app_name}-https-proxy"
  url_map = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

resource "google_compute_managed_ssl_certificate" "main" {
  name = "${var.app_name}-ssl-cert"
  managed {
    domains = ["${var.app_name}.example.com"]
  }
}

resource "google_compute_url_map" "main" {
  name            = "${var.app_name}-url-map"
  default_service = google_compute_backend_service.cloud_run.id
}

resource "google_compute_backend_service" "cloud_run" {
  name        = "${var.app_name}-backend-service"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_region_network_endpoint_group" "cloud_run" {
  name                  = "${var.app_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

output "cloud_run_url"   { value = google_cloud_run_v2_service.backend.uri }
output "db_connection"   { value = google_sql_database_instance.postgres.connection_name }
output "lb_ip"           { value = google_compute_global_forwarding_rule.https.ip_address }
