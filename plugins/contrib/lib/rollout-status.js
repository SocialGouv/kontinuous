const { setTimeout } = require("timers/promises")

const handledKinds = ["Deployment", "StatefulSet", "Job"]

const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any

module.exports = async (context) => {
  const { config, logger, utils, needBin, manifests, runContext } = context

  const { eventsBucket } = runContext

  const { needRolloutStatus, rolloutStatusWatch } = utils

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

  const stop = () => {
    interceptor.stop = true
    stopRolloutStatus()
  }

  let endAllTrigerred = false
  const endAll = async () => {
    if (endAllTrigerred) {
      return
    }
    endAllTrigerred = true
    interceptor.stop = true

    const stopDeployPromise = runContext.stopDeploys && runContext.stopDeploys()

    await setTimeout(waitBeforeStopAllRolloutStatus)

    stopRolloutStatus()

    await stopDeployPromise
  }

  const { deploymentLabelKey } = config

  await needBin(needRolloutStatus)

  const { kubeconfig, kubeconfigContext: kubecontext } = config

  const promises = []
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!handledKinds.includes(kind)) {
      continue
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const deploymentLabelValue = manifest.metadata?.labels?.[deploymentLabelKey]
    const namespace = manifest.metadata?.namespace
    if (!resourceName) {
      continue
    }
    const labelSelectors = []
    labelSelectors.push(`kontinuous/resourceName=${resourceName}`)
    if (deploymentLabelValue) {
      labelSelectors.push(`${deploymentLabelKey}=${deploymentLabelValue}`)
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
            logger.error(
              { namespace, selector },
              `resource "${resourceName}" failed`
            )
            endAll()
          } else {
            logger.info(
              { namespace, selector },
              `resource "${resourceName}" ready`
            )
            eventsBucket.trigger("ready", { namespace, resourceName, selector })
          }

          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    )
  }

  const promise = new Promise(async (resolve, reject) => {
    let results
    try {
      results = await Promise.allSettled(promises)
    } catch (err) {
      reject(err)
    }
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
          errors.push(value.error)
        }
      } else {
        logger.fatal({ result }, `Unexpected promise result`)
      }
    }
    if (errors.length) {
      for (const errorData of errors) {
        logger.error(
          {
            code: errorData.code,
            type: errorData.type,
            log: errorData.log,
            message: errorData.message,
          },
          `rollout-status ${errorData.code} error: ${errorData.message}`
        )
      }
    }
    resolve({ errors })
  })

  return { stop, promise }
}
