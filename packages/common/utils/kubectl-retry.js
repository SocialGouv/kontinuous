const { spawn } = require("child_process")

const retry = require("async-retry")

const parseCommand = require("./parse-command")
const defaultLogger = require("./logger")

const kubectlRun = async (kubectlArgs, options = {}) => {
  const { kubeconfig, ignoreErrors = [], stdin } = options

  if (Array.isArray(kubectlArgs)) {
    kubectlArgs = kubectlArgs.join(" ")
  }

  const [cmd, args] = parseCommand(`kubectl ${kubectlArgs}`)

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      encoding: "utf-8",
      env: {
        ...process.env,
        ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
      },
    })

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
      proc.stdin.write(stdin)
      proc.stdin.end()
    }
  })
}

module.exports = async (kubectlArgs, options = {}) => {
  const { logger = defaultLogger, logError = true, logInfo = true } = options

  let result

  try {
    result = await retry(
      async (bail) => {
        try {
          await kubectlRun(kubectlArgs, options)
        } catch (err) {
          if (
            err.message.includes(
              "Unable to connect to the server: net/http: TLS handshake timeout"
            )
          ) {
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
