const { generate } = require("@socialgouv/env-slug")

const { buildCtx } = require("./ctx")

const versionTagRe = /v[0-9]*/

function generateValues() {
  const {
    ENVIRONMENT,
    RANCHER_PROJECT_ID,
    RANCHER_PROJECT_NAME,
    GIT_REPOSITORY,
    GIT_REF,
    GIT_SHA,
    GIT_HEAD_REF,
  } = buildCtx.require("env")

  const gitBranch = (GIT_HEAD_REF || GIT_REF)
    .replace("refs/heads/", "")
    .replace("refs/tags/", "")

  const branchSlug = generate(gitBranch)

  const env = ENVIRONMENT
  const isProduction = env === "prod"
  const isPreProduction = env === "preprod"
  const isDev = !(isProduction || isPreProduction)

  const repository = GIT_REPOSITORY
  const repositoryName = repository.split("/").pop()

  const subdomain = isProduction
    ? repositoryName
    : isPreProduction
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${gitBranch}`)

  const namespace = isProduction
    ? repositoryName
    : isPreProduction
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = GIT_SHA
  const imageTag = isPreProduction
    ? `preprod-${sha}`
    : versionTagRe.test(gitBranch)
    ? gitBranch
    : `sha-${sha}`

  const MAX_HOSTNAME_SIZE = 53
  const shortenHost = (hostname) =>
    hostname.slice(0, MAX_HOSTNAME_SIZE).replace(/-+$/, "")

  const rootSocialGouvDomain = "fabrique.social.gouv.fr"

  const domain = isProduction
    ? rootSocialGouvDomain
    : `dev.${rootSocialGouvDomain}`

  const host = `${shortenHost(subdomain)}.${domain}`

  const registry = "ghcr.io/socialgouv"
  const imageName = repositoryName

  const rancherProjectId = RANCHER_PROJECT_ID

  const certSecretName = isProduction ? `${repositoryName}-crt` : "wildcard-crt"

  const pgSecretName = isProduction
    ? "pg-user"
    : isPreProduction
    ? "pg-user-preprod"
    : `pg-user-${branchSlug}`

  const productionDatabase = repositoryName

  const pgDatabase = isProduction
    ? productionDatabase
    : isPreProduction
    ? "preprod"
    : `autodevops_${branchSlug}`

  const pgUser = isProduction
    ? productionDatabase
    : isPreProduction
    ? "preprod"
    : `user_${branchSlug}`

  const rancherProjectName = RANCHER_PROJECT_NAME || repositoryName
  const jobNamespace = `${rancherProjectName}-ci`

  return {
    global: {
      repository,
      repositoryName,
      isProduction,
      isPreProduction,
      ttl,
      namespace,
      rancherProjectId,
      certSecretName,
      pgSecretName,
      pgDatabase,
      pgUser,
      host,
      domain,
      registry,
      imageName,
      imageTag,
      branchSlug,
      gitBranch,
      jobNamespace,
      sha,
      env,
    },
  }
}

module.exports = generateValues
