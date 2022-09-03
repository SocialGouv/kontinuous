const { setTimeout } = require("timers/promises")

const ctx = require("~common/ctx")
const needRolloutStatus = require("~common/utils/need-rollout-status")
const rolloutStatusExec = require("~common/utils/rollout-status-exec")

const needBin = require("~/bin/need-bin")

const handledKinds = ["Deployment", "StatefulSet"]

const checkForNewResourceInterval = 3000
const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any
const kappTerminationTolerationPeriod = 2000

const rolloutStatusWatchForNewResource = async ({
  selector,
  resourceName,
  namespace,
  interceptor,
  rolloutStatusProcesses,
}) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

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
    const status = await rolloutStatusPromise
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

module.exports = async ({ manifests, kappDeployProcess }) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")

  const stopKapp = async () => {
    try {
      process.kill(kappDeployProcess.pid, "SIGTERM")
      await setTimeout(kappTerminationTolerationPeriod)
      process.kill(kappDeployProcess.pid, "SIGKILL")
    } catch (_err) {
      // do nothing
    }
  }
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

  const endRolloutStatus = () => {
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

    const stopKappPromise = stopKapp()

    await setTimeout(waitBeforeStopAllRolloutStatus)

    stopRolloutStatus()

    await stopKappPromise
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
        if (reason) {
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

  return { endRolloutStatus, promise }
}
