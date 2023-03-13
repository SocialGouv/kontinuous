const defaultRolloutStatus = require("./rollout-status")
const getLogger = require("./get-logger")
const waitAppear = require("./wait-appear")

module.exports = async (options) => {
  const {
    namespace,
    selector,
    kubeconfig,
    kubecontext,
    abortSignal,
    surviveOnBrokenCluster = false,
    pendingDeadLineSeconds = 300,
    kindFilter,
    logger = getLogger(),
    rolloutStatus = defaultRolloutStatus,
  } = options
  return waitAppear(options, async () => {
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
      return status
    }
  })
}
