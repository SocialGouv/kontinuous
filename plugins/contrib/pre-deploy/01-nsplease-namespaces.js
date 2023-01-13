module.exports = async (
  manifests,
  _options,
  { utils, config, logger, kubectl }
) => {
  const { kubeEnsureNamespace } = utils
  const { kubeconfig, kubeconfigContext } = config

  const nspleaseManifests = manifests.filter(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.labels?.["nsplease/project"]
  )

  if (nspleaseManifests.length === 0) {
    return
  }

  const namespaces = nspleaseManifests.map((manifest) => manifest.metadata.name)

  logger.debug({ namespaces }, "ensure nsplease namespaces are availables")

  const check = async (remoteManifest, bail) => {
    const state = remoteManifest.metadata.annotations["nsplease/state"]
    if (state === "done") {
      return true
    }
    if (state === "failed") {
      bail(
        new Error(
          `nsplease failed on namespace "${remoteManifest.metadata.name}"`
        )
      )
    }
    return false
  }

  await Promise.all(
    nspleaseManifests.map((manifest) =>
      kubeEnsureNamespace({
        kubeconfig,
        kubeconfigContext,
        manifest,
        check,
        kubectl,
      })
    )
  )
  logger.debug({ namespaces }, "namespaces ready")
}
