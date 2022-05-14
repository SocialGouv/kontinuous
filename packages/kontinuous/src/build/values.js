const slug = require("~common/utils/slug")
const deepmerge = require("~common/utils/deepmerge")

const ctx = require("~/ctx")

const isVersionTag = require("~common/utils/is-version-tag")
const cleanGitRef = require("~common/utils/clean-git-ref")

const MAX_DNS_LENGTH = 63

const defaults = require("~/config/defaults")

module.exports = (values) => {
  
  const {
    KS_ENVIRONMENT,
    KS_RANCHER_PROJECT_ID,
    KS_RANCHER_PROJECT_NAME,
    KS_GIT_REPOSITORY,
    KS_GIT_REF,
    KS_GIT_SHA,
    KS_BASE_DOMAIN,
    KS_REGISTRY,
  } = ctx.require("env")

  const gitBranch = cleanGitRef(KS_GIT_REF)

  const branchSlug = slug(gitBranch)

  const env = KS_ENVIRONMENT
  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const repository = KS_GIT_REPOSITORY
  const repositoryName = repository.split("/").pop()

  const globalHostMaxLength = MAX_DNS_LENGTH - Math.max(...Object.keys(values).map(key=>key.length))

  
  const subdomain = isProd
  ? repositoryName
  : isPreProd
  ? `${repositoryName}-preprod`
  : slug(`${repositoryName}-${gitBranch}`, {maxLength: globalHostMaxLength})


  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = KS_GIT_SHA

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

  let domain
  if(KS_BASE_DOMAIN){
    domain = KS_BASE_DOMAIN
  } else {
    domain = isProd ? defaults.rootDomain : `dev.${defaults.rootDomain}`
  }
  
  
  const host = `${subdomain}.${domain}`

  const registry = KS_REGISTRY || defaults.registry
  const imageRepository = repositoryName

  const rancherProjectId = KS_RANCHER_PROJECT_ID

  const pgSecretName = isProd
    ? "pg-user"
    : isPreProd
    ? "pg-user"
    : `pg-user-${branchSlug}`

  const productionDatabase = repositoryName

  const branchSlug32 = slug(gitBranch, 32)

  const pgDatabase = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `autodevops_${branchSlug32}`

  const pgUser = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `user_${branchSlug32}`
  

  const rancherProjectName = KS_RANCHER_PROJECT_NAME || repositoryName
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
      branchSlug32,
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
