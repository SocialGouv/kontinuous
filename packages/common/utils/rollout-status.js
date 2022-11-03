const retry = require("async-retry")

const rolloutStatusExec = require("./rollout-status-exec")

const globalLogger = require("./logger")

module.exports = async ({
  kubeconfig,
  kubecontext,
  namespace,
  selector,
  logger = globalLogger,
  ignoreSecretNotFound = true,
}) =>
  retry(
    async (bail) => {
      try {
        const { promise } = rolloutStatusExec({
          kubeconfig,
          kubecontext,
          namespace,
          selector,
          ignoreSecretNotFound,
        })
        const output = await promise
        return output
      } catch (err) {
        if (err.message.includes("net/http: TLS handshake timeout")) {
          logger.debug(
            `rollout-status network error(net/http: TLS handshake timeout): retrying...`
          )
          throw err
        }
        bail(err)
      }
    },
    {
      retries: 2,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 3000,
    }
  )
