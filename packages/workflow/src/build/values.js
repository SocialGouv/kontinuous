const slug = require("~common/utils/slug")
const deepmerge = require("~common/utils/deepmerge")

const { buildCtx } = require("./ctx")

const isVersionTag = require("~common/utils/is-version-tag")
const cleanGitRef = require("~common/utils/clean-git-ref")

module.exports = (values) => {
  
  const {
    KW_ENVIRONMENT,
    KW_RANCHER_PROJECT_ID,
    KW_RANCHER_PROJECT_NAME,
    KW_GIT_REPOSITORY,
    KW_GIT_REF,
    KW_GIT_SHA,
  } = buildCtx.require("env")

  const gitBranch = cleanGitRef(KW_GIT_REF)

  const branchSlug = slug(gitBranch)

  const env = KW_ENVIRONMENT
  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const repository = KW_GIT_REPOSITORY
  const repositoryName = repository.split("/").pop()

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = KW_GIT_SHA

  const shortSha = sha.slice(0, 7)

  let imageTag
  if (isPreProd) {
    imageTag = `preprod-${sha}`
  } else if (isProd) {
    if (isVersionTag(gitBranch)) {
      imageTag = gitBranch.substring(1)
    } else {
      imageTag = "prod"
    }
  } else {
    imageTag = `sha-${sha}`
  }

  const rootSocialGouvDomain = "fabrique.social.gouv.fr"

  const domain = isProd ? rootSocialGouvDomain : `dev.${rootSocialGouvDomain}`

  const host = `${subdomain}.${domain}`

  const registry = "ghcr.io/socialgouv"
  const imageRepository = repositoryName

  const rancherProjectId = KW_RANCHER_PROJECT_ID

  const pgSecretName = isProd
    ? "pg-user"
    : isPreProd
    ? "pg-user"
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

  const rancherProjectName = KW_RANCHER_PROJECT_NAME || repositoryName
  const jobNamespace = `${rancherProjectName}-ci`

  const imageProject = ""
  // const imageProject = rancherProjectName

  const defaultValues = {
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

  values = deepmerge({}, defaultValues, values)

  return values
}
