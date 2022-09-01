const defaultOptions = {
  kind: ["Deployment", "StatefulSet", "DaemonSet"],
  env: ["dev"],
}

module.exports = async (
  manifests,
  options,
  { utils, config, logger, needBin }
) => {
  const opts = { ...defaultOptions, ...options }

  let { env: envMatch } = opts
  if (!Array.isArray(envMatch)) {
    envMatch = [envMatch]
  }

  if (!envMatch.includes(config.environment)) {
    return
  }

  let { kind: resourceKind } = opts
  if (!Array.isArray(resourceKind)) {
    resourceKind = [resourceKind]
  }

  const manifestsToClean = []
  for (const manifest of manifests) {
    if (resourceKind.includes(manifest.kind)) {
      manifestsToClean.push(manifest)
    }
  }

  if (manifestsToClean.length === 0) {
    return
  }

  const resourceNames = manifestsToClean.map(
    (manifest) => manifest.metadata?.name || manifest.name
  )

  await needBin(utils.needKubectl)
  const { kubectlDeleteManifest } = utils
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
  }
  await kubectlDeleteManifest(manifestsToClean, kubectlDeleteManifestOptions)

  logger.debug({ resourceKind, resourceNames }, "resources cleared")
}
