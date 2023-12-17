const { persistPatterns } = require("../lib/persist-convention")

module.exports = async (values, options, { config, utils, ctx }) => {
  console.log("GLOBAL")
  const { isVersionTag, slug, deepmerge, patternMatch } = utils

  const processEnv = ctx.get("env") || process.env

  const { RANCHER_PROJECT_ID: rancherProjectId } = processEnv

  const {
    environment,
    gitRepository,
    gitBranch,
    gitSha,
    workspacePath,
    pipelineId,
  } = config

  const branchSlug = slug(gitBranch)

  const isProd = environment === "prod"
  const isPreProd = environment === "preprod"
  const isDev = !(isProd || isPreProd)

  const { repositoryName } = config

  const { registry, enableDefaultCharts = false, mergeValues = {} } = options

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
      imageTag = gitBranch
    } else {
      imageTag = "prod"
    }
  } else if (patternMatch(gitBranch, persistPatterns)) {
    imageTag = `persist-${sha}`
  } else {
    imageTag = `sha-${sha}`
  }

  const imageRepository = repositoryName.toLowerCase()

  const branchSlug32 = slug(gitBranch, 32)

  const { projectName } = config

  const { ciNamespace } = config

  const replicas = isProd ? 2 : 1

  let hasRancher
  if (options.hasRancher !== undefined) {
    hasRancher = options.hasRancher
  } else if (environment === "local") {
    hasRancher = false
  } else {
    hasRancher = true
  }

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
      imageRepository,
      imageTag,
      branchSlug,
      branchSlug32,
      gitBranch,
      ciNamespace,
      sha,
      shortSha,
      env: environment,
      namespaceEnabled:
        !hasRancher && enableDefaultCharts && values.global.kontinuous.hasAll,
      rancherNamespaceEnabled:
        hasRancher && enableDefaultCharts && values.global.kontinuous.hasAll,
      securityPoliciesEnabled:
        enableDefaultCharts && values.global.kontinuous.hasAll,
      outputVolumeEnabled: values.global.kontinuous.hasOutput,
      ingress: {
        annotations: {},
      },
      workspacePath,
      antiAffinity: { enabled: true },
      pipelineId,
      jobsConfig: {
        // serviceAccountName: "job-account",
        // priorityClassName: "ci-jobs-priority",
      },
    },
  }

  values = deepmerge({}, defaultValues, values, { global: mergeValues })

  return values
}
