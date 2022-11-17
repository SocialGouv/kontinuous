const retry = require("async-retry")
const kubectlRetry = require("./kubectl-retry")

const defaultLogger = require("./logger")

const checkNamespaceIsAvailable = async ({
  kubeconfig,
  kubeconfigContext,
  namespace,
  logger,
  check,
  bail,
}) => {
  logger.debug("checking if namespace is available")
  try {
    const json = await kubectlRetry(`get ns ${namespace} -o json`, {
      kubeconfig,
      kubeconfigContext,
      logInfo: false,
      ignoreErrors: ["NotFound", "Forbidden"],
      logger,
    })
    const data = JSON.parse(json)
    const phase = data?.status.phase
    // logger.debug(`namespace "${namespace}" phase is "${phase}"`)
    if (phase === "Active") {
      if (check) {
        const ready = await check(data, bail)
        return ready
      }
      return true
    }
    return false
  } catch (err) {
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
  check,
}) => {
  const namespace = manifest.metadata.name

  const ensureNamespace = async (verb) => {
    await kubectlRetry(
      [
        ...(kubeconfigContext ? [`--context=${kubeconfigContext}`] : []),
        ...verb,
        "-f",
        "-",
      ],
      {
        kubeconfig,
        ignoreErrors: ["AlreadyExists"],
        stdin: JSON.stringify(manifest),
      }
    )
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
    await ensureNamespace(["apply"])
    return
  }

  await ensureNamespace(["create", "--save-config"])

  await retry(
    async (bail) => {
      if (
        !(await checkNamespaceIsAvailable({
          kubeconfig,
          kubeconfigContext,
          namespace,
          logger,
          bail,
          check,
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
