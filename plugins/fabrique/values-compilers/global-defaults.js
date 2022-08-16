const MAX_DNS_LENGTH = 63

// const defaultRegistry = "ghcr.io/socialgouv"
const defaultRegistry = "harbor.fabrique.social.gouv.fr"
const defaultRootDomain = "fabrique.social.gouv.fr"

module.exports = async (values, _options, { config, utils, ctx }) => {
  const { isVersionTag, slug, deepmerge } = utils

  const processEnv = ctx.get("env") || process.env

  const { KUBE_INGRESS_BASE_DOMAIN, RANCHER_PROJECT_ID } = processEnv

  const { environment, gitRepository, gitBranch, gitSha } = config

  const branchSlug = slug(gitBranch)

  const env = environment

  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const { repositoryName } = config

  const globalHostMaxLength =
    MAX_DNS_LENGTH - Math.max(...Object.keys(values).map((key) => key.length))

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`, { maxLength: globalHostMaxLength })

  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = gitSha

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
  if (KUBE_INGRESS_BASE_DOMAIN) {
    domain = KUBE_INGRESS_BASE_DOMAIN
  } else {
    domain = isProd ? defaultRootDomain : `dev.${defaultRootDomain}`
  }

  const rancherProjectId = RANCHER_PROJECT_ID

  const host = `${subdomain}.${domain}`

  const registry = defaultRegistry
  const imageRepository = repositoryName

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

  const { projectName } = config

  const ciNamespace =
    config.ciNamespace || `${projectName || repositoryName}-ci`

  const imageProject = projectName || ""

  const replicas = isProd ? 2 : 1

  const defaultValues = {
    global: {
      projectName,
      certSecretName: "wildcard-crt",
      registrySecretRefName: "harbor",
      repository: gitRepository,
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
      replicas,
      imageProject,
      imageRepository,
      imageTag,
      branchSlug,
      branchSlug32,
      gitBranch,
      ciNamespace,
      sha,
      shortSha,
      env,
      ingress: {
        annotations: {},
      },
      antiAffinity: { enabled: true },
      jobsConfig: {
        // serviceAccountName: "job-account",
        // priorityClassName: "ci-jobs-priority",
      },
      // extra: {
      //   jobs: {
      //     sharedStorage: {
      //       enabled: true,
      //       size: "2Gi",
      //       className: "azurefile",
      //     },
      //   },
      // },
    },
  }

  values = deepmerge({}, defaultValues, values)

  return values
}
