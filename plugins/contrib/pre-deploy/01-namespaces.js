module.exports = async (
  manifests,
  _options,
  { utils, config, logger, needBin }
) => {
  const { kubeEnsureNamespace } = utils
  const { kubeconfig, kubeconfigContext } = config

  const namespacesManifests = manifests.filter(
    (manifest) => manifest.kind === "Namespace"
  )

  if (namespacesManifests.length === 0) {
    return
  }

  const namespaces = namespacesManifests.map(
    (manifest) => manifest.metadata.name
  )

  logger.debug({ namespaces }, "ensure namespaces are availables")

  await needBin(utils.needKubectl)

  await Promise.all(
    namespacesManifests.map((manifest) =>
      kubeEnsureNamespace({ kubeconfig, kubeconfigContext, manifest })
    )
  )
  logger.debug({ namespaces }, "namespaces ready")
}
