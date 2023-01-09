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
  let retryCount = 0
  const throwErrorToRetry = ({ error, message }) => {
    retryCount++
    logger.debug(
      { namespace, selector, from: "rollout-status", retryCount },
      message
    )
    throw error
  }

  const throwRetriableError = (err) => {
    if (err.message?.includes("net/http: TLS handshake timeout")) {
      throwErrorToRetry({
        error: err,
        message: `rollout-status network error(net/http: TLS handshake timeout): retrying...`,
      })
    }
    if (surviveOnBrokenCluster) {
      const retriable = retriableOnBrokenCluster(err)
      if (retriable.retry) {
        throwErrorToRetry({
          error: err,
          message: `${retriable.message}, retrying...`,
        })
        throw err
      }
    }
  }

  return retry(
    async (bail) => {
      let status
      let error
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
        throwRetriableError(err)
        error = err
      }
      if (
        retryErrImagePull &&
        status?.error?.message?.includes("ErrImagePull")
      ) {
        throwErrorToRetry({
          error: new Error(status.error.message),
          message: `rollout-status registry error(ErrImagePull): retrying...`,
        })
      }
      if (status?.error?.type === "program") {
        throwErrorToRetry({
          error: new Error(status.error.message),
          message: `rollout-status program error: ${status.error.message}: retrying...`,
        })
      }
      if (error) {
        bail(error)
      }
      return status
    },
    {
      retries: 10,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 60000,
      randomize: true,
    }
  )
}
