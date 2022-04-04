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
  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const repository = GIT_REPOSITORY
  const repositoryName = repository.split("/").pop()

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${gitBranch}`)

  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : generate(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = GIT_SHA

  const shortSha = sha.slice(0, 7)

  let imageTag
  if (isPreProd) {
    imageTag = `preprod-${sha}`
  } else if (isProd) {
    if (versionTagRe.test(gitBranch)) {
      gitBranch.substring(1)
    } else {
      imageTag = "prod"
    }
  } else {
    imageTag = `sha-${sha}`
  }

  const MAX_HOSTNAME_SIZE = 53
  const shortenHost = (hostname) =>
    hostname.slice(0, MAX_HOSTNAME_SIZE).replace(/-+$/, "")

  const rootSocialGouvDomain = "fabrique.social.gouv.fr"

  const domain = isProd ? rootSocialGouvDomain : `dev.${rootSocialGouvDomain}`

  const host = `${shortenHost(subdomain)}.${domain}`

  const registry = "ghcr.io/socialgouv"
  const imageRepository = repositoryName

  const rancherProjectId = RANCHER_PROJECT_ID

  const pgSecretName = isProd
    ? "pg-user"
    : isPreProd
    ? "pg-user-preprod"
    : `pg-user-${branchSlug}`

  const productionDatabase = repositoryName

  const pgDatabase = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `autodevops_${branchSlug}`

  const pgUser = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `user_${branchSlug}`

  const rancherProjectName = RANCHER_PROJECT_NAME || repositoryName
  const jobNamespace = `${rancherProjectName}-ci`

  const imageProject = ""
  // const imageProject = rancherProjectName

  return {
    global: {
      repository,
      repositoryName,
      isDev,
      isProd,
      isPreProd,
      ttl,
      namespace,
      rancherProjectId,
      pgSecretName,
      pgDatabase,
      pgUser,
      host,
      domain,
      registry,
      imageProject,
      imageRepository,
      imageTag,
      branchSlug,
      gitBranch,
      jobNamespace,
      sha,
      shortSha,
      env,
      extra: {
        jobs: {
          sharedStorage: {
            enabled: true,
          },
        },
      },
    },
  }
}

module.exports = generateValues
