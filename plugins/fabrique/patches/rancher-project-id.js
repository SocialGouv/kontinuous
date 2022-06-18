const resolveEnum = ["required", "skip", "optional"]

module.exports = async (manifests, options, { config, logger, utils }) => {
  const { asyncShell } = utils
  const { ciNamespace, kubeconfigContext } = config

  const { resolve = "required" } = options

  if (!resolveEnum.includes(resolve)) {
    throw new Error(
      `invalid 'resolve' option "${resolve}" for rancher-project-id patch, expected one of ${resolveEnum.join(
        ","
      )}`
    )
  }

  if (resolve === "skip") {
    return
  }

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
      if (resolve === "required") {
        const errorMsg =
          "unable to retrieve required missing rancher projectId from cluster"
        logger.error(errorMsg)
        throw new Error(errorMsg)
      } else {
        logger.warn(
          "unable to retrieve optional missing rancher projectId from cluster"
        )
      }
    }
  }

  for (const manifest of rancherNsMissingProjectId) {
    manifest.metadata.annotations["field.cattle.io/projectId"] =
      rancherProjectId
  }
}
