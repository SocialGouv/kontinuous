const retry = require("async-retry")

const rolloutStatusExec = require("./rollout-status-exec")
const retriableOnBrokenCluster = require("./retriable-on-broken-cluster")

const defaultLogger = require("./logger")

module.exports = async ({
  kubeconfig,
  kubecontext,
  namespace,
  selector,
  logger = defaultLogger,
  ignoreSecretNotFound = true,
  retryErrImagePull = true,
  setProcessRef,
  kindFilter,
  surviveOnBrokenCluster,
}) => {
  const throwRetriableError = async (err, status) => {
    if (err.message?.includes("net/http: TLS handshake timeout")) {
      logger.debug(
        { namespace, selector },
        `rollout-status network error(net/http: TLS handshake timeout): retrying...`
      )
      throw err
    }
    if (retryErrImagePull && err.message?.includes("ErrImagePull")) {
      logger.debug(
        { namespace, selector },
        `rollout-status registry error(ErrImagePull): retrying...`
      )
      throw err
    }
    if (surviveOnBrokenCluster) {
      const retriable = retriableOnBrokenCluster(err)
      if (retriable.retry) {
        logger.debug(
          { error: err, from: "rollout-status" },
          `${retriable.message}, retrying...`
        )
        throw err
      }
    }
    if (status?.error?.type === "program") {
      throw new Error(status.error.message)
    }
  }

  return retry(
    async (bail) => {
      let status
      try {
        const { promise, process } = rolloutStatusExec({
          kubeconfig,
          kubecontext,
          namespace,
          selector,
          ignoreSecretNotFound,
          kindFilter,
        })
        if (setProcessRef) {
          setProcessRef(process)
        }
        status = await promise
        if (status.error?.code === "") {
          throw new Error(status.error.message)
        }
      } catch (err) {
        throwRetriableError(err, status)
        bail(err)
      }
      return status
    },
    {
      retries: 2,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 3000,
    }
  )
}
