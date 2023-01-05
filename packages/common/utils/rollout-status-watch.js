const { setTimeout: sleep } = require("timers/promises")

const rolloutStatus = require("./rollout-status")
const defaultLogger = require("./logger")

module.exports = async ({
  namespace,
  selector,
  kubeconfig,
  kubecontext,
  logger = defaultLogger,
  interceptor = {},
  rolloutStatusProcesses = {},
  checkForNewResourceInterval = 3000,
  watchingTimeout = 3600000, // 60 minutes
  surviveOnBrokenCluster = false,
  kindFilter,
}) => {
  let timeoutReached = false
  const globalTimeout = setTimeout(() => {
    timeoutReached = true
  }, watchingTimeout)

  while (!interceptor.stop && !timeoutReached) {
    const status = await rolloutStatus({
      kubeconfig,
      kubecontext,
      namespace,
      selector,
      kindFilter,
      surviveOnBrokenCluster,
      setProcessRef: (rolloutStatusProcess) => {
        rolloutStatusProcesses[selector] = rolloutStatusProcess
      },
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
