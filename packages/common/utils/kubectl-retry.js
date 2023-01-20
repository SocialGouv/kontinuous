const { spawn } = require("child_process")

const retry = require("async-retry")

const parseCommand = require("./parse-command")
const getLogger = require("./get-logger")
const retriableOnBrokenCluster = require("./retriable-on-broken-cluster")
const retriableNetwork = require("./retriable-network")

const kubectlRun = async (kubectlArgs, options = {}) => {
  const {
    kubeconfig,
    kubeconfigContext,
    ignoreErrors = [],
    stdin,
    collectProcesses,
    abortSignal,
  } = options

  if (Array.isArray(kubectlArgs)) {
    kubectlArgs = kubectlArgs.join(" ")
  }

  const [cmd, args] = parseCommand(
    `kubectl ${
      kubeconfigContext ? `--context ${kubeconfigContext}` : ""
    } ${kubectlArgs}`
  )

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      encoding: "utf-8",
      env: {
        ...process.env,
        ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
        signal: abortSignal,
      },
    })

    collectProcesses.push(proc)

    if (stdin !== undefined) {
      proc.stdin.write(stdin)
    }

    const output = []
    proc.stdout.on("data", (data) => {
      output.push(data.toString())
    })

    let ignoreError
    const errorMessages = []
    proc.stderr.on("data", (data) => {
      const message = data.toString()
      if (ignoreErrors.some((errCatch) => message.includes(errCatch))) {
        ignoreError = true
      } else {
        errorMessages.push(message)
      }
    })

    proc.on("close", (code) => {
      if (code === 0 || code == null || ignoreError) {
        resolve(output.join(""))
      } else {
        reject(
          new Error(
            `kubectl ${kubectlArgs}; failed with exit code ${code}: ${errorMessages.join(
              ""
            )}`
          )
        )
      }
    })

    if (stdin !== undefined) {
      proc.stdin.end()
    }
  })
}

module.exports = async (kubectlArgs, options = {}) => {
  const {
    logger = getLogger(),
    logError = true,
    logInfo = true,
    collectProcesses = [],
    surviveOnBrokenCluster = false,
    sentry,
  } = options

  let { retryOptions = {} } = options
  retryOptions = {
    retries: 10,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 60000,
    randomize: true,
    ...retryOptions,
  }

  let result

  let retryCount = 0

  try {
    result = await retry(async (bail) => {
      try {
        const output = await kubectlRun(kubectlArgs, {
          ...options,
          collectProcesses,
        })
        return output
      } catch (err) {
        const retriableNetworkError = retriableNetwork(err)
        if (retriableNetworkError.retry) {
          retryCount++
          const willRetry = retryCount <= retryOptions.retries
          if (willRetry) {
            logger.debug(
              { retryCount, kubectlArgs },
              `${retriableNetworkError.message}, retrying...`
            )
          }
          if (sentry) {
            sentry.captureException(err, {
              level: willRetry ? "warning" : "fatal",
              tags: {
                retryCount: `${retryCount}`,
                retryType: "network",
                retryMessage: retriableNetworkError.message,
                willRetry: willRetry ? "true" : "false",
              },
            })
          }
          throw err
        }
        if (surviveOnBrokenCluster) {
          const retriable = retriableOnBrokenCluster(err)
          if (retriable.retry) {
            retryCount++
            const willRetry = retryCount <= retryOptions.retries
            if (willRetry) {
              logger.debug(
                { error: err, from: "kubectl", retryCount, kubectlArgs },
                `${retriable.message}, retrying...`
              )
            }
            if (sentry) {
              sentry.captureException(err, {
                level: willRetry ? "warning" : "fatal",
                tags: {
                  retryCount: `${retryCount}`,
                  retryType: "cluster",
                  retryMessage: retriable.message,
                  willRetry: willRetry ? "true" : "false",
                },
              })
            }
            throw err
          }
        }
        bail(err)
      }
    }, retryOptions)
    if (logInfo) {
      const msg = result.trim()
      if (msg) {
        logger.info(`☸️  ${msg}`)
      }
    }
  } catch (err) {
    if (logError) {
      logger.error(err)
    }
    throw err
  }

  return result
}
