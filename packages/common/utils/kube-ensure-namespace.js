const { spawn } = require("child_process")
const retry = require("async-retry")
const asyncShell = require("./async-shell")

const defaultLogger = require("./logger")

const checkNamespaceIsAvailable = async ({
  kubeconfig,
  kubeconfigContext,
  namespace,
  logger,
}) => {
  logger.debug("checking if namespace is available")
  try {
    const json = await asyncShell(
      `kubectl ${
        kubeconfigContext ? `--context ${kubeconfigContext}` : ""
      } get ns ${namespace} -o json`,
      {
        env: {
          ...process.env,
          ...(kubeconfig
            ? {
                KUBECONFIG: kubeconfig,
              }
            : {}),
        },
      }
    )
    const data = JSON.parse(json)
    const phase = data?.status.phase
    // logger.debug(`namespace "${namespace}" phase is "${phase}"`)
    return phase === "Active"
  } catch (_err) {
    // do nothing
    // logger.debug(err)
  }
  return false
}

module.exports = async ({
  kubeconfig,
  kubeconfigContext,
  manifest,
  logger = defaultLogger,
}) => {
  const namespace = manifest.metadata.name

  const ensureNamespace = async (verb) => {
    try {
      let ignoreError
      await new Promise((resolve, reject) => {
        logger.info("creating namespace")
        const proc = spawn(
          "kubectl",
          [
            ...(kubeconfigContext ? [`--context=${kubeconfigContext}`] : []),
            ...verb,
            "-f",
            "-",
          ],
          {
            encoding: "utf-8",
            env: {
              ...process.env,
              ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
            },
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
            logger.info({ namespace }, "namespace already exists")
          } else {
            logger.warn({ namespace }, message)
          }
        })
        proc.on("close", (code) => {
          if (code === 0 || ignoreError) {
            resolve()
          } else {
            reject(
              new Error(`creating namespace failed with exit code ${code}`)
            )
          }
        })

        proc.stdin.end()
      })
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  logger.info(`ensure namespace "${namespace}" is active`)
  if (
    await checkNamespaceIsAvailable({
      kubeconfig,
      kubeconfigContext,
      namespace,
      logger,
    })
  ) {
    logger.info({ namespace }, "apply namespace")
    // await ensureNamespace(["apply"])
    return
  }

  await ensureNamespace(["create", "--save-config"])

  await retry(
    async () => {
      if (
        !(await checkNamespaceIsAvailable({
          kubeconfig,
          kubeconfigContext,
          namespace,
          logger,
        }))
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
