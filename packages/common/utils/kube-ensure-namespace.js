const { spawn } = require("child_process")
const retry = require("async-retry")
const asyncShell = require("./async-shell")

const defaultLogger = require("./logger")

const checkNamespaceIsAvailable = async (
  kubeconfigContext,
  namespace,
  logger
) => {
  logger.debug("checking if namespace is available")
  try {
    const json = await asyncShell(
      `kubectl --context ${kubeconfigContext} get ns ${namespace} -o json`
    )
    const data = JSON.parse(json)
    return data?.status.phase === "Active"
  } catch (_e) {
    // do nothing
  }
  return false
}

module.exports = async (
  kubeconfigContext,
  manifest,
  logger = defaultLogger
) => {
  const namespace = manifest.metadata.name

  logger.info(`ensure namespace "${namespace}" is active`)
  if (await checkNamespaceIsAvailable(kubeconfigContext, namespace, logger)) {
    return
  }

  try {
    let ignoreError
    await new Promise((resolve, reject) => {
      logger.info("creating namespace")
      const proc = spawn(
        "kubectl",
        [`--context=${kubeconfigContext}`, "create", "-f", "-"],
        {
          encoding: "utf-8",
        }
      )

      proc.stdin.write(JSON.stringify(manifest))

      proc.stdout.on("data", (data) => {
        process.stdout.write(data.toString())
      })
      proc.stderr.on("data", (data) => {
        const message = data.toString()
        if (message.includes("AlreadyExists")) {
          ignoreError = true
          logger.info("namespace already exists")
        } else {
          logger.warn(message)
        }
      })
      proc.on("close", (code) => {
        if (code === 0 || ignoreError) {
          resolve()
        } else {
          reject(new Error(`creating namespace failed with exit code ${code}`))
        }
      })

      proc.stdin.end()
    })
  } catch (err) {
    logger.error(err)
    throw err
  }

  await retry(
    async () => {
      if (
        !(await checkNamespaceIsAvailable(kubeconfigContext, namespace, logger))
      ) {
        throw Error(`namespace "${namespace}" is not available`)
      }
    },
    {
      retries: 10,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 3000,
    }
  )
}
