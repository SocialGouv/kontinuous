module.exports = async (manifests, options, { config, logger, utils }) => {
  const { writeKubeconfig, asyncShell } = utils
  const { ciNamespace, environment, kubeconfigContext } = config

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

  await writeKubeconfig([
    "KUBECONFIG",
    `KUBECONFIG_${environment.toUpperCase()}`,
  ])

  if (!ciNamespace) {
    logger.warn(
      `missing rancher projectId not provided, unable to retrieve it as ci-namespace is not defined`
    )
    return
  }

  logger.info(
    `missing rancher projectId, getting from cluster using ci-namespace "${ciNamespace}"`
  )

  let rancherProjectId
  if (options.rancherProjectId) {
    rancherProjectId = options.rancherProjectId
  } else if (process.env.RANCHER_PROJECT_ID) {
    rancherProjectId = process.env.RANCHER_PROJECT_ID
  } else {
    try {
      const json = await asyncShell(
        `kubectl --context ${kubeconfigContext} get ns ${ciNamespace} -o json`
      )
      const data = JSON.parse(json)
      rancherProjectId = data.metadata.annotations["field.cattle.io/projectId"]
    } catch (e) {
      logger.warn("unable to retrieve missing rancher projectId from cluster")
    }
  }

  for (const manifest of rancherNsMissingProjectId) {
    manifest.metadata.annotations["field.cattle.io/projectId"] =
      rancherProjectId
  }
}
