module.exports = async (manifests, options, context) => {
  const { logger, utils, needBin } = context
  const { needKubeconform, asyncShell, yaml, KontinuousPluginError } = utils

  await needBin(needKubeconform)

  const { kubeVersion = null, skip = [], throwError = false } = options

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
