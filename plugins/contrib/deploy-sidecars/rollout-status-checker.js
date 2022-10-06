const { setTimeout } = require("timers/promises")

const handledKinds = ["Deployment", "StatefulSet", "Job"]

const checkForNewResourceInterval = 3000
const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any

const rolloutStatusWatchForNewResource = async ({
  selector,
  resourceName,
  namespace,
  interceptor,
  rolloutStatusProcesses,
  utils,
  config,
  logger,
}) => {
  const { rolloutStatusExec } = utils

  const { kubeconfig, kubeconfigContext: kubecontext } = config

  logger.debug({ namespace, selector }, `watching resource: ${resourceName}`)
  while (!interceptor.stop) {
    const { promise: rolloutStatusPromise, process: rolloutStatusProcess } =
      rolloutStatusExec({
        kubeconfig,
        kubecontext,
        namespace,
        selector,
      })
    rolloutStatusProcesses[selector] = rolloutStatusProcess
    let status
    try {
      status = await rolloutStatusPromise
    } catch (err) {
      if (!err.message?.includes("net/http: TLS handshake timeout")) {
        throw err
      }
      logger.debug(
        { namespace, selector },
        `rollout-status network error(net/http: TLS handshake timeout): retrying...`
      )
      continue
    }
    const { success, error } = status
    if (success || error.code !== "not-found") {
      return status
    }
    await setTimeout(checkForNewResourceInterval)
    logger.trace(
      { namespace, selector },
      `watching resource: ${resourceName}, waiting to appear...`
    )
  }
  return { success: null }
}

module.exports = async (
  sidecars,
  _options,
  { config, logger, utils, needBin, manifests, stopDeploy }
) => {
  const { needRolloutStatus } = utils

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

  const stopSidecar = () => {
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

    const stopDeployPromise = stopDeploy()

    await setTimeout(waitBeforeStopAllRolloutStatus)

    stopRolloutStatus()

    await stopDeployPromise
  }

  const { refLabelKey } = config

  await needBin(needRolloutStatus)

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
          const result = await rolloutStatusWatchForNewResource({
            namespace,
            selector,
            resourceName,
            interceptor,
            rolloutStatusProcesses,
            utils,
            config,
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
        if (reason && Object.keys(reason) > 0) {
          logger.error({ reason }, "rollout-status exec error")
        }
      } else if (status === "fulfilled") {
        const { value } = result
        if (value.success === false) {
          errors.push(value.error)
        }
      } else {
        logger.fatal({ result }, `Unexpected promise result`)
      }
    }
    resolve({ errors })
  })

  sidecars.push({ stopSidecar, promise })
}
