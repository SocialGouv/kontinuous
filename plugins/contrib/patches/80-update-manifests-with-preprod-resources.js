module.exports = async function updateManifestsWithPreprodResources(
  manifests,
  _options,
  context
) {
  const { config, logger, kubectl } = context
  const { repositoryName, environment } = config

  if (environment !== "dev") {
    return
  }

  const preprodNamespace = `${repositoryName}-preprod`

  const { surviveOnBrokenCluster, kubeconfig, kubeconfigContext } = config

  async function getPreprodResources(name, kind) {
    try {
      const result = await kubectl(
        `get -n ${preprodNamespace} ${kind} ${name} -o json`,
        {
          kubeconfig,
          kubeconfigContext,
          logInfo: false,
          logError: false,
          surviveOnBrokenCluster,
        }
      )
      const resourceData = JSON.parse(result)
      return resourceData.spec.template.spec.containers.reduce(
        (acc, container) => {
          acc[container.name] = container.resources
          return acc
        },
        {}
      )
    } catch (err) {
      logger.warn({ err }, `Failed to get resources for ${kind} ${name}`)
      return {}
    }
  }

  function updateResources(container, preprodResources) {
    if (preprodResources[container.name]) {
      container.resources = preprodResources[container.name]
    }
  }

  for (const manifest of manifests) {
    if (["Deployment", "StatefulSet"].includes(manifest.kind)) {
      const preprodResources = await getPreprodResources(
        manifest.metadata.name,
        manifest.kind.toLowerCase()
      )
      for (const container of manifest.spec.template.spec.containers) {
        updateResources(container, preprodResources)
      }
    } else if (manifest.kind === "CronJob") {
      const preprodResources = await getPreprodResources(
        manifest.metadata.name,
        "cronjob"
      )
      for (const container of manifest.spec.jobTemplate.spec.template.spec
        .containers) {
        updateResources(container, preprodResources)
      }
    }
  }
}
