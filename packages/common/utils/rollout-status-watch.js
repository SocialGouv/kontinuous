const { setTimeout: sleep } = require("timers/promises")

const defaultRolloutStatus = require("./rollout-status")
const defaultLogger = require("./logger")

module.exports = async ({
  namespace,
  selector,
  kubeconfig,
  kubecontext,
  abortSignal,
  checkForNewResourceInterval = 3000,
  watchingTimeout = 3600000, // 60 minutes
  surviveOnBrokenCluster = false,
  pendingDeadLineSeconds = 300,
  kindFilter,
  logger = defaultLogger,
  rolloutStatus = defaultRolloutStatus,
}) => {
  let timeoutReached = false
  const globalTimeout = setTimeout(() => {
    timeoutReached = true
  }, watchingTimeout)

  while (!abortSignal?.aborted && !timeoutReached) {
    const status = await rolloutStatus({
      abortSignal,
      kubeconfig,
      kubecontext,
      namespace,
      selector,
      pendingDeadLineSeconds,
      kindFilter,
      surviveOnBrokenCluster,
      logger,
    })
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
