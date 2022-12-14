const defaultApiResources = [
  "configmaps",
  "secrets",
  "horizontalpodautoscalers",
  "persistentvolumeclaims",
  "cronjobs",
  "jobs",
  "deployments",
  "statefulsets",
  "ingresses",
]

module.exports = async (
  manifests,
  options,
  { utils, config, logger, needBin }
) => {
  const { kubeconfig, kubeconfigContext } = config
  const { kubectlRetry, kubectlGetApiResource } = utils

  await needBin(utils.needRolloutStatus)

  logger.debug("♻️ check for orphan resources to clean")

  const { deploymentEnvLabelKey, deploymentEnvLabelValue } = config

  const manifestUniqKey = (manifest) =>
    `${manifest.metadata.namespace || ""}/${manifest.kind}/${
      manifest.metadata.name
    }`

  const manifestKeys = manifests.map(manifestUniqKey)

  const namespacesSet = manifests.reduce((set, m) => {
    if (m.kind !== "Namespace" && m.metadata.namespace) {
      set.add(m.metadata.namespace)
    }
    return set
  }, new Set())
  const namespaces = [...namespacesSet]

  const kubectlOptions = {
    kubeconfig,
    kubeconfigContext,
  }

  const manifestsToClean = []

  const {
    guessApiResources = false,
    nativeApiResources = defaultApiResources,
    crdApiResources = [],
  } = options
  let { apiResources } = options
  if (guessApiResources) {
    apiResources = await kubectlGetApiResource(kubectlOptions)
  } else if (!apiResources) {
    apiResources = [...nativeApiResources, ...crdApiResources]
  }

  await Promise.all(
    namespaces.map(async (ns) =>
      Promise.all(
        apiResources.map(async (apiResource) => {
          const resourcesOutput = await kubectlRetry(
            `get ${apiResource} -n ${ns} -o json -l ${deploymentEnvLabelKey}=${deploymentEnvLabelValue}`,
            { ...kubectlOptions, logInfo: false }
          )
          const resources = JSON.parse(resourcesOutput)
          const { items = [] } = resources
          for (const item of items) {
            const manifestKey = manifestUniqKey(item)
            if (!manifestKeys.includes(manifestKey)) {
              manifestsToClean.push(item)
            }
          }
        })
      )
    )
  )

  if (manifestsToClean.length === 0) {
    logger.debug("♻️ no resources to clean")
    return
  }

  const resourceNames = manifestsToClean.map(
    (manifest) => manifest.metadata?.name || manifest.name
  )

  const { surviveOnBrokenCluster = false } = options

  const { kubectlDeleteManifest } = utils
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
    surviveOnBrokenCluster,
  }

  logger.debug("♻️ cleaning orphan resources")

  await kubectlDeleteManifest(manifestsToClean, kubectlDeleteManifestOptions)

  logger.debug({ resourceNames }, "♻️ orphan resources cleaned")
}
