module.exports = async (
  manifests,
  options,
  { utils, config, logger, kubectl }
) => {
  const defaultOptions = {
    kind: [
      ...utils.rolloutStatusHandledKinds,
      ...(options.customWaitableKinds || []),
    ],
    env: ["dev"],
  }
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
    (manifest) => manifest.metadata?.name
  )

  const { surviveOnBrokenCluster = false } = options

  const { kubectlDeleteManifest } = utils
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
    surviveOnBrokenCluster,
    kubectl,
  }
  await kubectlDeleteManifest(manifestsToClean, kubectlDeleteManifestOptions)

  logger.debug({ resourceKind, resourceNames }, "resources cleared")
}
