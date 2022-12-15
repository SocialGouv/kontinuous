const handledKinds = ["Deployment", "StatefulSet", "Job"]

module.exports = async (
  manifests,
  options,
  { utils, config, logger, needBin }
) => {
  const { refLabelKey, kubeconfig, kubeconfigContext: kubecontext } = config
  const { rolloutStatus } = utils

  await needBin(utils.needRolloutStatus)

  logger.debug("♻️ check for failed resources to clean")

  const promises = []
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!handledKinds.includes(kind)) {
      continue
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const ref = manifest.metadata?.labels?.[refLabelKey]
    const namespace = manifest.metadata?.namespace
    if (!resourceName) {
      continue
    }
    const labelSelectors = []
    labelSelectors.push(`kontinuous/resourceName=${resourceName}`)
    if (ref) {
      labelSelectors.push(`${refLabelKey}=${ref}`)
    }
    const selector = labelSelectors.join(",")
    promises.push(
      new Promise(async (resolve, reject) => {
        try {
          const status = await rolloutStatus({
            kubeconfig,
            kubecontext,
            namespace,
            selector,
            ignoreSecretNotFound: false,
          })
          const { success, error } = status
          if (!success) {
            if (error.code === "not-found") {
              resolve(null)
            } else {
              logger.debug(
                { status },
                "♻️ failed resource identified, will clean it before next deploy"
              )
              resolve(manifest)
            }
          } else {
            resolve(null)
          }
        } catch (err) {
          console.log({ err })
          reject(err)
        }
      })
    )
  }

  const manifestsToClean = (await Promise.all(promises)).filter((m) => !!m)

  if (manifestsToClean.length === 0) {
    logger.debug("♻️ no resources to clean")
    return
  }

  const resourceNames = manifestsToClean.map(
    (manifest) => manifest.metadata?.name || manifest.name
  )

  const { surviveOnBrokenCluster = false } = options

  await needBin(utils.needKubectl)
  const { kubectlDeleteManifest } = utils
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig: config.kubeconfig,
    kubeconfigContext: config.kubeconfigContext,
    surviveOnBrokenCluster,
  }

  logger.debug("♻️ cleaning failed resources")

  await kubectlDeleteManifest(manifestsToClean, kubectlDeleteManifestOptions)

  logger.debug({ resourceNames }, "♻️ failed resources cleaned")
}