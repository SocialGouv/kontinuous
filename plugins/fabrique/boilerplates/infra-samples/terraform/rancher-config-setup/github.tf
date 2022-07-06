resource "github_actions_secret" "kubewebhook_token_secret" {
  for_each = {
    for repo in local.public_repos : repo.name => repo
  }

  repository      = each.value.name
  secret_name     = "KUBEWEBHOOK_TOKEN"
  plaintext_value = random_password.kubewebhook_token.result
}

resource "github_repository_webhook" "kubewebhook_repository_events_push" {
  for_each = {
    for repo in local.public_repos : repo.name => repo
  }

  repository      = each.value.name

  configuration {
    url          = "https://webhook-${local.project_name}.fabrique.social.gouv.fr/api/v1/oas/hooks/github?event=pushed"
    content_type = "json"
    secret = random_password.kubewebhook_token.result
  }

  active = false

  events = ["create","push"]
}

resource "github_repository_webhook" "kubewebhook_repository_events_delete" {
  for_each = {
    for repo in local.public_repos : repo.name => repo
  }

  repository      = each.value.name

  configuration {
    url          = "https://webhook-${local.project_name}.fabrique.social.gouv.fr/api/v1/oas/hooks/github?event=deleted"
    content_type = "json"
    secret = random_password.kubewebhook_token.result
  }

  active = false

  events = ["delete"]
}
