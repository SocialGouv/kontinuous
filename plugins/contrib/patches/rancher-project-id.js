module.exports = async (manifests, options, { config, logger, kubectl }) => {
  const { ciNamespace, kubeconfig, kubeconfigContext } = config

  const rancherNsMissingProjectId = []
  for (const manifest of manifests) {
    if (
      !(
        manifest.kind === "Namespace" &&
        manifest.metadata?.annotations?.["field.cattle.io/projectId"] === ""
      )
    ) {
      continue
    }
    rancherNsMissingProjectId.push(manifest)
  }

  if (rancherNsMissingProjectId.length === 0) {
    return
  }

  if (!ciNamespace) {
    logger.warn(
      `missing rancher projectId not provided, unable to retrieve it as ci-namespace is not defined`
    )
    return
  }

  const { surviveOnBrokenCluster = false } = options

  let rancherProjectId = ""
  if (options.rancherProjectId) {
    rancherProjectId = options.rancherProjectId
  } else if (process.env.RANCHER_PROJECT_ID) {
    rancherProjectId = process.env.RANCHER_PROJECT_ID
  } else {
    logger.info(
      `missing rancher projectId, getting from cluster using ci-namespace "${ciNamespace}"`
    )
    try {
      const json = await kubectl(
        `${
          kubeconfigContext ? `--context ${kubeconfigContext}` : ""
        } get ns ${ciNamespace} -o json`,
        {
          kubeconfig,
          logInfo: false,
          surviveOnBrokenCluster,
        }
      )
      const data = JSON.parse(json)
      rancherProjectId = data.metadata.annotations["field.cattle.io/projectId"]
    } catch (error) {
      logger.warn(
        { error },
        "unable to retrieve optional missing rancher projectId from cluster"
      )
    }
  }

  for (const manifest of rancherNsMissingProjectId) {
    manifest.metadata.annotations["field.cattle.io/projectId"] =
      rancherProjectId
  }
}
