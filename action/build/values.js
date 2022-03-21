const { generate } = require("@socialgouv/env-slug")

const { buildCtx } = require("./ctx")

function generateValues() {
  const {
    REPOSITORY,
    ENVIRONMENT,
    RANCHER_PROJECT_ID,
    RANCHER_PROJECT_NAME,
    GIT_REF,
    GIT_SHA,
    GIT_HEAD_REF,
  } = buildCtx.require("env")

  const gitBranch = GIT_HEAD_REF || GIT_REF
  const branchName = gitBranch
    .replace("refs/heads/", "")
    .replace("refs/tags/", "")

  const branchSlug = generate(branchName)

  const env = ENVIRONMENT
  const isProduction = env === "prod"
  const isPreProduction = env === "preprod"
  const isDev = !(isProduction || isPreProduction)

  const repository = REPOSITORY
  const repositoryName = repository.split("/").pop()

  const subdomain = isProduction
    ? repositoryName
    : isPreProduction
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${branchName}`)

  const namespace = isProduction
    ? repositoryName
    : isPreProduction
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${branchName}`)

  const isRenovate = branchName.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = GIT_SHA
  const imageTag = isPreProduction
    ? `preprod-${sha}`
    : gitBranch.startsWith("refs/tags/")
    ? (gitBranch.split("/").pop() || "").substring(1)
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

  const jobNamespace = `${RANCHER_PROJECT_NAME || repositoryName}-ci`

  return {
    global: {
      repository,
      repositoryName,
      isProduction,
      isPreProduction,
      ttl,
      namespace,
      gitBranch,
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
      branchName,
      jobNamespace,
      sha,
      env,
    },
  }
}

module.exports = generateValues
