const kubectlRetry = require("./kubectl-retry")

const getLogger = require("./get-logger")

/**
 *
 * @param {object} param0
 * @param {string} param0.kubeconfig
 * @param {string} param0.kubeconfigContext
 * @param {string} param0.namespace
 * @param {Kontinuous.Patch.Context["logger"]} [param0.logger]
 * @param {Function} [param0.check]
 * @param {boolean} [param0.bail]
 * @param {boolean} [param0.surviveOnBrokenCluster]
 * @param {import("./kubectl-retry").KubectlRetryOptions} [param0.retryOptions]
 * @param {Function} [param0.kubectl]
 * @returns
 */
module.exports = async ({
  kubeconfig,
  kubeconfigContext,
  namespace,
  logger = getLogger(),
  check,
  bail,
  surviveOnBrokenCluster,
  retryOptions,
  kubectl = kubectlRetry,
}) => {
  logger.debug("🟦 checking if namespace is available")
  try {
    const json = await kubectl(`get ns ${namespace} -o json`, {
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
