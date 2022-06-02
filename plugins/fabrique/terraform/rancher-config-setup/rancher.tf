### kube-workflow - dev - ci ###
resource "rancher2_namespace" "dev_project_ci" {
  name       = "${local.project_name}-ci"
  project_id = rancher2_project.dev_team_project.id
}

resource "rancher2_secret" "kubeconfig_dev" {
  name         = "kubeconfig"
  project_id   = rancher2_project.dev_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    KUBECONFIG         = base64encode(format("%s", data.external.kube_config.result.dev))
  }
}

resource "rancher2_secret" "harbor_dev" {
  name         = "harbor"
  project_id   = rancher2_project.dev_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    CI_REGISTRY = base64encode(format("%s", "harbor.fabrique.social.gouv.fr"))
    CI_REGISTRY_USER = base64encode(format("%s", harbor_robot_account.this.full_name))
    CI_REGISTRY_PASSWORD = base64encode(format("%s", harbor_robot_account.this.secret))
  }
}


### kube-workflow - prod - ci ###
resource "rancher2_namespace" "prod_project_ci" {
  name       = "${local.project_name}-ci"
  project_id = rancher2_project.prod_team_project.id
}

resource "rancher2_secret" "kubeconfig_prod" {
  name         = "kubeconfig"
  project_id   = rancher2_project.prod_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    KUBECONFIG         = base64encode(format("%s", data.external.kube_config.result.prod))
  }
}

resource "rancher2_secret" "harbor_prod" {
  name         = "harbor"
  project_id   = rancher2_project.prod_team_project.id
  namespace_id = "${local.project_name}-ci"
  data = {
    CI_REGISTRY = base64encode(format("%s", "harbor.fabrique.social.gouv.fr"))
    CI_REGISTRY_USER = base64encode(format("%s", harbor_robot_account.this.full_name))
    CI_REGISTRY_PASSWORD = base64encode(format("%s", harbor_robot_account.this.secret))
  }
}

### kube-workflow - prod - webhook ###
resource "rancher2_namespace" "prod_project_webhook" {
  name       = "webhook-${local.project_name}"
  project_id = rancher2_project.prod_team_project.id
}

resource "random_password" "kubewebhook_token" {
  length           = 32
  special           = false
}

resource "rancher2_secret" "kubewebhook_prod" {
  name         = "kubewebhook"
  project_id   = rancher2_project.prod_team_project.id
  namespace_id = "webhook-${local.project_name}"
  data = {
    KUBEWEBHOOK_TOKEN = base64encode(format("%s", random_password.kubewebhook_token.result))
  }
}

resource "rancher2_secret" "kubeconfig_webhook_dev" {
  name         = "kubeconfig-dev"
  namespace_id = "webhook-${local.project_name}"
  project_id   = rancher2_project.prod_team_project.id
  data = {
    KUBECONFIG_DEV         = base64encode(format("%s", data.external.kube_config.result.dev))
  }
}

resource "rancher2_secret" "kubeconfig_webhook_prod" {
  name         = "kubeconfig-prod"
  namespace_id = "webhook-${local.project_name}"
  project_id   = rancher2_project.prod_team_project.id
  data = {
    KUBECONFIG_PROD         = base64encode(format("%s", data.external.kube_config.result.prod))
  }
}
