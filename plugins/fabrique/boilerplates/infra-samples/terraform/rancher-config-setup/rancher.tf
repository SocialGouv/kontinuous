### kontinuous - dev - ci ###
resource "rancher2_namespace" "dev_project_ci" {
  name       = "${local.project_name}-ci"
  project_id = rancher2_project.dev_team_project.id
}
resource "rancher2_secret" "kubeconfig_dev" {
  name         = "kubeconfig"
  project_id   = rancher2_project.dev_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    KUBECONFIG = base64encode(format("%s", data.external.kube_config.result.dev))
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}

resource "rancher2_secret" "harbor_dev" {
  name         = "harbor"
  project_id   = rancher2_project.dev_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    CI_REGISTRY          = base64encode(format("%s", "harbor.fabrique.social.gouv.fr"))
    CI_REGISTRY_USER     = base64encode(format("%s", harbor_robot_account.this.full_name))
    CI_REGISTRY_PASSWORD = base64encode(format("%s", harbor_robot_account.this.secret))
  }
}


### kontinuous - prod - ci ###
resource "rancher2_namespace" "prod_project_ci" {
  name       = "${local.project_name}-ci"
  project_id = rancher2_project.prod_team_project.id
}

resource "rancher2_secret" "kubeconfig_prod" {
  name         = "kubeconfig"
  project_id   = rancher2_project.prod_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    KUBECONFIG = base64encode(format("%s", data.external.kube_config.result.prod))
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}

resource "rancher2_secret" "harbor_prod" {
  name         = "harbor"
  project_id   = rancher2_project.prod_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    CI_REGISTRY          = base64encode(format("%s", "harbor.fabrique.social.gouv.fr"))
    CI_REGISTRY_USER     = base64encode(format("%s", harbor_robot_account.this.full_name))
    CI_REGISTRY_PASSWORD = base64encode(format("%s", harbor_robot_account.this.secret))
  }
}

### kontinuous - prod - webhook ###
resource "kubernetes_namespace" "kontinuous_webhook" {
  metadata {
    name       = "kontinuous-webhook"
  }
}

resource "random_password" "kubewebhook_token" {
  length  = 32
  special = false
}

resource "kubernetes_secret" "kubewebhook_prod" {
  metadata {
    name       = "webhook-token-${local.project_name}"
    namespace  = "kontinuous-webhook"
  }
  data = {
    TOKEN = "${format("%s", random_password.kubewebhook_token.result)}"
  }
}



resource "kubernetes_secret" "kubeconfig_webhook_dev" {
  metadata {
    name       = "kubeconfig-dev-${local.project_name}"
    namespace  = "kontinuous-webhook"
  }
  data = {
    KUBECONFIG = "${format("%s", data.external.kube_config.result.dev)}"
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}
resource "kubernetes_secret" "kubeconfig_webhook_prod" {
  metadata {
    name       = "kubeconfig-prod-${local.project_name}"
    namespace  = "kontinuous-webhook"
  }
  data = {
    KUBECONFIG = "${format("%s", data.external.kube_config.result.prod)}"
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}


resource "kubernetes_secret" "kubewebhook_ci_prod" {
  metadata {
    name       = "kubewebhook"
    namespace  = "${local.project_name}-ci"
  }
  data = {
    KUBEWEBHOOK_TOKEN = "${format("%s", random_password.kubewebhook_token.result)}"
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}

resource "kubernetes_secret" "kubewebhook_ci_dev" {
  metadata {
    name       = "kubewebhook"
    namespace  = "${local.project_name}-ci"
  }
  data = {
    KUBEWEBHOOK_TOKEN = "${format("%s", random_password.kubewebhook_token.result)}"
  }
  lifecycle {
    ignore_changes = [
      data
    ]
  }
}