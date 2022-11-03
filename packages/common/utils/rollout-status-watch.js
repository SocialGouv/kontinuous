const { setTimeout } = require("timers/promises")

const rolloutStatusExec = require("./rollout-status-exec")
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
}) => {
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
      `watching resource: ${selector}, waiting to appear...`
    )
  }
  return { success: null }
}
