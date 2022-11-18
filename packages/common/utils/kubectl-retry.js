const { setTimeout: sleep } = require("timers/promises")
const { spawn } = require("child_process")

const retry = require("async-retry")

const parseCommand = require("./parse-command")
const defaultLogger = require("./logger")
const retriableOnBrokenCluster = require("./retriable-on-broken-cluster")
const retriableNetwork = require("./retriable-network")

const kubectlRun = async (kubectlArgs, options = {}) => {
  const {
    kubeconfig,
    kubeconfigContext,
    ignoreErrors = [],
    stdin,
    collectProcesses,
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
      if (code === 0 || ignoreError) {
        resolve(output.join(""))
      } else {
        reject(
          new Error(
            `kubectl failed with exit code ${code}: ${errorMessages.join("")}`
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
    logger = defaultLogger,
    logError = true,
    logInfo = true,
    retryOptions = {},
    collectProcesses = [],
    surviveOnBrokenCluster = false,
  } = options

  let result

  try {
    result = await retry(
      async (bail) => {
        try {
          const output = await kubectlRun(kubectlArgs, {
            ...options,
            collectProcesses,
          })
          return output
        } catch (err) {
          const retriableNetworkError = retriableNetwork(err)
          if (retriableNetworkError.retry) {
            logger.debug(`${retriableNetworkError.message}, retrying...`)
            throw err
          }
          if (surviveOnBrokenCluster) {
            const retriable = retriableOnBrokenCluster(err)
            if (retriable.retry) {
              logger.debug({ error: err }, `${retriable.message}, retrying...`)
              await sleep(3000)
              throw err
            }
          }
          bail(err)
        }
      },
      {
        retries: 2,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
        ...retryOptions,
      }
    )
    if (logInfo) {
      logger.info(result)
    }
  } catch (err) {
    if (logError) {
      logger.error(err)
    }
    throw err
  }

  return result
}
