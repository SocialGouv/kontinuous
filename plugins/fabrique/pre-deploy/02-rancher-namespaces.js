module.exports = async (
  manifests,
  _options,
  { utils, config, logger, needBin }
) => {
  const { kubeEnsureNamespace } = utils
  const { kubeconfig, kubeconfigContext } = config

  const rancherNamespacesManifests = manifests.filter(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.annotations?.["field.cattle.io/projectId"]
  )

  if (rancherNamespacesManifests.length === 0) {
    return
  }

  const namespaces = rancherNamespacesManifests.map(
    (manifest) => manifest.metadata.name
  )

  logger.debug({ namespaces }, "ensure rancher namespaces are available")

  await needBin(utils.needKubectl)

  await Promise.all(
    rancherNamespacesManifests.map((manifest) =>
      kubeEnsureNamespace({ kubeconfig, kubeconfigContext, manifest })
    )
  )
  logger.debug({ namespaces }, "namespaces ready")
}
