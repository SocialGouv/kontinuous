const matchAnnotation = "kontinuous/plugin.preDeploy.cleaner"

module.exports = async (
  manifests,
  _options,
  { utils, config, logger, needBin }
) => {
  await needBin(utils.needKubectl)

  const { kubectlDeleteManifest } = utils
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
  }

  const promises = []
  for (const manifest of manifests) {
    const { metadata } = manifest
    const clean = metadata?.annotations?.[matchAnnotation]
    if (clean !== "true") {
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
    logger.debug({ kind, name, namespace }, "clean resource")

    promises.push(kubectlDeleteManifest(manifest, kubectlDeleteManifestOptions))
  }

  if (promises.length === 0) {
    return
  }

  await Promise.all(promises)
  logger.debug("resources cleaned")
}
