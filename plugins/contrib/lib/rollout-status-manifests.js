const { setTimeout } = require("timers/promises")

const handledKinds = ["Deployment", "StatefulSet", "Job"]

const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any

module.exports = async (context) => {
  const { config, logger, utils, needBin, manifests, runContext } = context

  const { eventsBucket } = runContext

  const { needRolloutStatus, rolloutStatusWatch, promiseAll } = utils

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

  const {
    kubeconfig,
    kubeconfigContext: kubecontext,
    surviveOnBrokenCluster,
  } = config

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
          const eventParam = { namespace, resourceName, selector }
          eventsBucket.trigger("waiting", eventParam)
          const result = await rolloutStatusWatch({
            namespace,
            selector,
            interceptor,
            rolloutStatusProcesses,
            kubeconfig,
            kubecontext,
            logger,
            surviveOnBrokenCluster,
          })

          if (result.success) {
            logger.debug(
              { namespace, selector },
              `resource "${resourceName}" ready`
            )
            eventsBucket.trigger("ready", eventParam)
          } else if (result.error?.code || result.error?.reason) {
            logger.error(
              {
                namespace,
                selector,
                error: result.error,
              },
              `resource "${resourceName}" failed`
            )
            eventsBucket.trigger("failed", eventParam)
            endAll()
          } else {
            eventsBucket.trigger("closed", eventParam)
          }

          resolve({
            ...result,
            namespace,
            selector,
          })
        } catch (err) {
          reject(err)
        }
      })
    )
  }

  const optionalField = (err, field) =>
    err[field] ? `${field}: ${err[field]}` : ""
  const errorFields = ["code", "type", "message", "log"]

  const promise = new Promise(async (resolve, reject) => {
    try {
      const results = await promiseAll(promises)
      const errors = []
      for (const result of results) {
        if (result.success !== true && result.error?.code) {
          errors.push(result)
        }
      }
      if (errors.length) {
        // for (const errorData of errors) {
        //   logger.error(
        //     {
        //       code: errorData.code,
        //       type: errorData.type,
        //       log: errorData.log,
        //       message: errorData.message,
        //     },
        //     `rollout-status ${errorData.code} error: ${errorData.message}`
        //   )
        // }
        throw new AggregateError(
          errors.map(
            ({ error, namespace, selector }) =>
              new Error(
                `${errorFields
                  .map((field) => optionalField(error, field))
                  .join(
                    ", "
                  )} on namespace="${namespace}" selector="${selector}"`
              )
          ),
          "rollout-status error"
        )
      }
      resolve(true)
    } catch (err) {
      reject(err)
    }
  })

  return { stop, promise }
}
