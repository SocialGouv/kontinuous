const retry = require("async-retry")

const kubectlRetry = require("./kubectl-retry")
const checkNamespaceIsAvailable = require("./check-namespace-is-available")
const defaultLogger = require("./logger")

module.exports = async ({
  kubeconfig,
  kubeconfigContext,
  manifest,
  logger = defaultLogger,
  check,
  surviveOnBrokenCluster,
  kubectlRetryOptions,
  retryOptions = {},
}) => {
  const namespace = manifest.metadata.name

  const kubectlOptions = {
    kubeconfig,
    kubeconfigContext,
    surviveOnBrokenCluster,
    retryOptions: kubectlRetryOptions,
    logger,
  }

  const ensureNamespace = async (verb) => {
    await kubectlRetry([...verb, "-f", "-"], {
      ...kubectlOptions,
      ignoreErrors: ["AlreadyExists"],
      stdin: JSON.stringify(manifest),
    })
  }

  const checkNamespaceIsAvailableOptions = {
    ...kubectlOptions,
    namespace,
  }

  logger.info(`ensure namespace "${namespace}" is active`)
  if (await checkNamespaceIsAvailable(checkNamespaceIsAvailableOptions)) {
    logger.info({ namespace }, "apply namespace")
    await ensureNamespace(["apply"])
    return
  }

  await ensureNamespace(["create", "--save-config"])

  await retry(
    async (bail) => {
      if (
        !(await checkNamespaceIsAvailable({
          ...checkNamespaceIsAvailableOptions,
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
      ...retryOptions,
    }
  )
}
