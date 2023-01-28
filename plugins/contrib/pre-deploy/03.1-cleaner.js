const matchAnnotation = "kontinuous/plugin.preDeploy.cleaner"

module.exports = async (
  manifests,
  options,
  { utils, config, logger, kubectl }
) => {
  const { kubectlDeleteManifest } = utils

  const { surviveOnBrokenCluster = false, cleanKinds = ["Job"] } = options

  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
    surviveOnBrokenCluster,
    kubectl,
  }

  const promises = []
  for (const manifest of manifests) {
    const { metadata } = manifest
    const cleanKind = cleanKinds.includes(manifest.kind)
    const clean = metadata?.annotations?.[matchAnnotation]
    if (!cleanKind && clean !== "true") {
      continue
    }
    const { kind } = manifest
    const { name } = metadata
    let namespace
    if (kind === "Namespace") {
      namespace = metadata.name
    } else {
      namespace = metadata.namespace
    }
    logger.debug({ kind, name, namespace }, "🔥 cleaning resource")

    promises.push(kubectlDeleteManifest(manifest, kubectlDeleteManifestOptions))
  }

  if (promises.length === 0) {
    return
  }

  await Promise.all(promises)
  logger.debug("🔥 resources cleaned")
}
