const { setTimeout: sleep } = require("timers/promises")

const rolloutStatusExec = require("./rollout-status-exec")
const defaultLogger = require("./logger")
const retriableOnBrokenCluster = require("./retriable-on-broken-cluster")

module.exports = async ({
  namespace,
  selector,
  kubeconfig,
  kubecontext,
  logger = defaultLogger,
  interceptor = {},
  rolloutStatusProcesses = {},
  checkForNewResourceInterval = 3000,
  maxErrorRetry = 3,
  waitBeforeRetryImagePullError = 10000,
  watchingTimeout = 3600000, // 60 minutes
  surviveOnBrokenCluster = false,
}) => {
  let errorRetry = 0

  let timeoutReached = false
  const globalTimeout = setTimeout(() => {
    timeoutReached = true
  }, watchingTimeout)

  while (!interceptor.stop && !timeoutReached) {
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
      if (status.error?.code === "") {
        throw new Error(status.error.message)
      }
    } catch (err) {
      if (errorRetry >= maxErrorRetry) {
        throw err
      }
      if (err.message?.includes("net/http: TLS handshake timeout")) {
        logger.debug(
          { namespace, selector },
          `rollout-status network error(net/http: TLS handshake timeout): retrying...`
        )
        await sleep(3000)
        errorRetry++
        continue
      }
      if (surviveOnBrokenCluster) {
        const retriable = retriableOnBrokenCluster(err)
        if (retriable.retry) {
          logger.debug(
            { error: err, from: "rollout-status" },
            `${retriable.message}, retrying...`
          )
          await sleep(3000)
          errorRetry++
          continue
        }
      }
      if (err.message?.includes("ErrImagePull")) {
        logger.debug(
          { namespace, selector },
          `rollout-status registry error(ErrImagePull): retrying...`
        )
        await sleep(waitBeforeRetryImagePullError)
        errorRetry++
        continue
      }
      throw err
    }
    const { success, error } = status
    if (success || error.code !== "not-found") {
      clearTimeout(globalTimeout)
      return status
    }
    await sleep(checkForNewResourceInterval)
    logger.trace(
      { namespace, selector },
      `watching resource: ${selector}, waiting to appear...`
    )
  }
  clearTimeout(globalTimeout)
  return { success: null }
}
