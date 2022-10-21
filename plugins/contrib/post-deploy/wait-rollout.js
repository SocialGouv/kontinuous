const { setTimeout } = require("timers/promises")

const handledKinds = ["Deployment", "StatefulSet", "Job"]

const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any

module.exports = async (
  manifests,
  _options,
  { config, logger, utils, needBin, dryRun }
) => {
  if (dryRun) {
    return
  }

  const { needRolloutStatus, rolloutStatusWatch, KontinuousPluginError } = utils

  const rolloutStatusProcesses = {}
  const stopRolloutStatus = () => {
    for (const p of Object.values(rolloutStatusProcesses)) {
      try {
        process.kill(p.pid, "SIGKILL")
      } catch (_err) {
        // do nothing
      }
    }
  }

  const interceptor = { stop: false }

  let endAllTrigerred = false
  const endAll = async () => {
    if (endAllTrigerred) {
      return
    }
    endAllTrigerred = true
    interceptor.stop = true

    await setTimeout(waitBeforeStopAllRolloutStatus)

    stopRolloutStatus()
  }

  const { refLabelKey } = config

  await needBin(needRolloutStatus)

  const { kubeconfig, kubeconfigContext: kubecontext } = config

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
          logger.debug(
            { namespace, selector },
            `watching resource: ${resourceName}`
          )
          const result = await rolloutStatusWatch({
            namespace,
            selector,
            interceptor,
            rolloutStatusProcesses,
            kubeconfig,
            kubecontext,
            logger,
          })
          if (!result.success) {
            endAll()
          }
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    )
  }

  const results = await Promise.allSettled(promises)
  const errors = []
  for (const result of results) {
    const { status } = result
    if (status === "rejected") {
      const { reason } = result
      if (reason instanceof Error) {
        errors.push(reason.message)
      } else {
        errors.push(reason)
      }
    } else if (status === "fulfilled") {
      const { value } = result
      if (value.success !== true) {
        const { error } = value
        if (error.code !== null) {
          errors.push(error)
        }
      }
    } else {
      logger.fatal({ result }, `Unexpected promise result`)
    }
  }
  if (errors.length > 0) {
    throw new KontinuousPluginError(JSON.stringify(errors))
  }
}
