module.exports = async (values, options, { config, utils, ctx }) => {
  const { isVersionTag, slug, deepmerge } = utils

  const processEnv = ctx.get("env") || process.env

  const { RANCHER_PROJECT_ID: rancherProjectId } = processEnv

  const { environment, gitRepository, gitBranch, gitSha } = config

  const branchSlug = slug(gitBranch)

  const isProd = environment === "prod"
  const isPreProd = environment === "preprod"
  const isDev = !(isProd || isPreProd)

  const { repositoryName } = config

  const { registry } = options

  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

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

  const imageRepository = repositoryName.toLowerCase()

  const branchSlug32 = slug(gitBranch, 32)

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
      namespace,
      rancherProjectId,
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
      env: environment,
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
