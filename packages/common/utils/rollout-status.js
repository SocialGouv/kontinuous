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
  kindFilter,
  pendingDeadLineSeconds,
  surviveOnBrokenCluster,
  retries = 10,
  abortSignal,
  sentry,
}) => {
  let retryCount = 0
  const throwErrorToRetry = ({ error, message, type }) => {
    retryCount++
    const willRetry = retryCount <= retries
    if (willRetry) {
      logger.debug(
        { namespace, selector, from: "rollout-status", retryCount },
        message
      )
    }
    if (sentry) {
      sentry.captureException(error, {
        level: willRetry ? "warning" : "fatal",
        tags: {
          retryCount: `${retryCount}`,
          retryType: type,
          retryMessage: message,
          willRetry: willRetry ? "true" : "false",
        },
      })
    }
    throw error
  }

  const throwRetriableError = (err) => {
    if (err.message?.includes("net/http: TLS handshake timeout")) {
      throwErrorToRetry({
        error: err,
        message: `rollout-status network error(net/http: TLS handshake timeout): retrying...`,
        type: "network",
      })
    }
    if (surviveOnBrokenCluster) {
      const retriable = retriableOnBrokenCluster(err)
      if (retriable.retry) {
        throwErrorToRetry({
          error: err,
          message: `${retriable.message}, retrying...`,
          type: "cluster",
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
        const { promise } = rolloutStatusExec({
          kubeconfig,
          kubecontext,
          namespace,
          selector,
          ignoreSecretNotFound,
          kindFilter,
          pendingDeadLineSeconds,
          abortSignal,
        })

        status = await promise
        logger.debug(
          { namespace, selector },
          `rollout-status result: ${JSON.stringify(status)}`
        )
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
          type: "err-image-pull",
        })
      }
      if (status?.error?.type === "program") {
        throwErrorToRetry({
          error: new Error(status.error.message),
          message: `rollout-status program error: ${status.error.message}: retrying...`,
          type: "rollout-status-program",
        })
      }
      if (error) {
        bail(error)
      }
      return status
    },
    {
      retries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 60000,
      randomize: true,
    }
  )
}
