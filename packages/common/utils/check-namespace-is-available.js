const kubectlRetry = require("./kubectl-retry")

const defaultLogger = require("./logger")

module.exports = async ({
  kubeconfig,
  kubeconfigContext,
  namespace,
  logger = defaultLogger,
  check,
  bail,
  surviveOnBrokenCluster,
  retryOptions,
}) => {
  logger.debug("checking if namespace is available")
  try {
    const json = await kubectlRetry(`get ns ${namespace} -o json`, {
      kubeconfig,
      kubeconfigContext,
      logInfo: false,
      ignoreErrors: ["NotFound", "Forbidden"],
      logger,
      surviveOnBrokenCluster,
      retryOptions,
    })
    const data = JSON.parse(json)
    const phase = data?.status.phase
    // logger.debug(`namespace "${namespace}" phase is "${phase}"`)
    if (phase === "Active") {
      if (check) {
        const ready = await check(data, bail)
        return ready
      }
      return true
    }
    return false
  } catch (err) {
    // do nothing
    // logger.debug(err)
  }
  return false
}