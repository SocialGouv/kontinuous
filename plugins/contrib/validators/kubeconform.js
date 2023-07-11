module.exports = async (manifests, options, context) => {
  const { logger, utils, kubectl, needBin, config } = context
  const {
    needKubeconform,
    asyncShell,
    yaml,
    KontinuousPluginError,
    detectKubeVersion,
  } = utils

  await needBin(needKubeconform)

  let { kubeVersion = null } = options

  const {
    autoDetect = !kubeVersion,
    skip = [],
    throwError = false,
    surviveOnBrokenCluster = false,
  } = options

  if (autoDetect) {
    const detected = await detectKubeVersion({
      kubectl,
      surviveOnBrokenCluster,
      kubeconfig: config.kubeconfig,
      kubeconfigContext: config.kubeconfigContext,
    })
    if (detected) {
      logger.debug(`🟩 Kubeconform detected kubernetes version ${detected}`)
      kubeVersion = detected
    }
  }

  const cmd = `kubeconform -summary ${
    kubeVersion ? `-kubernetes-version ${kubeVersion}` : ""
  } ${skip ? `-skip ${skip.join(",")}` : ""}`

  const manifestsString = yaml.dumpAll(manifests)

  try {
    const output = await asyncShell(cmd, {}, (proc) => {
      proc.stdin.write(manifestsString)
      proc.stdin.end()
    })
    logger.debug(`🟩 Kubeconform ${output}`)
  } catch (error) {
    logger.error(`🟥 Kubeconform ${error.message}`, { error })
    if (throwError) {
      throw new KontinuousPluginError(error.message)
    }
  }
}
