const { setTimeout: sleep } = require("timers/promises")

const retry = require("async-retry")

const kubectlRetry = require("./kubectl-retry")
const retriableNetwork = require("./retriable-network")
const retriableOnBrokenCluster = require("./retriable-on-broken-cluster")
const getLogger = require("./get-logger")

// this adress this issue https://github.com/kubernetes/kubernetes/issues/28369

module.exports = async (jobName, options = {}) => {
  const {
    namespace,
    stdout = process.stdout,
    since,
    follow = true,
    kubeconfig,
    kubectlRetryOptions,
    surviveOnBrokenCluster,
    retrySince = "20s",
    logger = getLogger(),
    retryErrorsConfig = {},
    kubectl = kubectlRetry,
  } = options

  // to debug/test remove --follow and reswitch getLogs

  const { $ } = await import("zx")
  $.verbose = false

  let lastTimestamp

  const sinceParam = `${since ? `--since=${since}` : ""}`
  const followParam = `${follow ? "--follow" : ""}`
  const namespaceParam = `${namespace ? `--namespace=${namespace}` : ""}`

  const getLogs = async (retrying = false) => {
    const resource = `jobs/${jobName}`
    $.env = {
      ...process.env,
      ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
    }
    const logging = $`kubectl ${namespaceParam} logs ${resource} ${
      retrying ? `--since=${retrySince}` : sinceParam
    } ${followParam} --timestamps`
    for await (const chunk of logging.stdout) {
      const lines = Buffer.from(chunk).toString()
      for (const line of lines.split("\n")) {
        const timeSepIndex = line.indexOf(" ")
        if (timeSepIndex === -1) {
          continue
        }
        const timestamp = line.slice(0, timeSepIndex)
        const output = line.slice(timeSepIndex + 1)
        if (timestamp <= lastTimestamp) {
          continue
        }
        lastTimestamp = timestamp
        stdout.write(`${output}\n`)
      }
    }

    await logging
  }

  const getLogsWithErrorRetry = async (...args) => {
    await retry(
      async (bail) => {
        try {
          await getLogs(...args)
        } catch (err) {
          const retriableNetworkError = retriableNetwork(err)
          if (retriableNetworkError.retry) {
            logger.debug(`🌐 ${retriableNetworkError.message}, retrying...`)
            throw err
          }
          if (surviveOnBrokenCluster) {
            const retriable = retriableOnBrokenCluster(err)
            if (retriable.retry) {
              logger.debug(
                { error: err },
                `💣 ${retriable.message}, retrying...`
              )
              await sleep(3000)
              throw err
            }
          }
          bail(err)
        }
      },
      {
        retries: 10,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 60000,
        randomize: true,
        ...retryErrorsConfig,
      }
    )
  }

  let ended = false
  const maxIterations = 10
  let countIterations = 0
  while (!ended && countIterations <= maxIterations) {
    await getLogsWithErrorRetry(countIterations > 0)
    // await getLogsWithErrorRetry(true) // debug/test

    const jsonStatus = await kubectl(
      `${
        namespace ? `-n ${namespace}` : ""
      } get job ${jobName} -o jsonpath={.status}`,
      {
        logInfo: false,
        kubeconfig,
        retryOptions: kubectlRetryOptions,
        surviveOnBrokenCluster,
      }
    )
    const status = JSON.parse(jsonStatus)
    ended = status.active !== 1 || status.succeeded === 1 || status.failed === 1
    countIterations++
  }
}
