const importSecret = require("../lib/import-secrets")

module.exports = async (manifests, options, context) => {
  const { config, logger, kubectl, utils, needBin } = context
  const { KontinuousPluginError, needKubeseal } = utils

  await needBin(needKubeseal)

  let { kubesealEndpoint } = options

  if (!kubesealEndpoint) {
    const { clusters } = options
    const cluster = config.environment === "prod" ? clusters.prod : clusters.dev
    if (cluster) {
      ;({ kubesealEndpoint } = cluster)
    }
  }
  if (!kubesealEndpoint) {
    throw new KontinuousPluginError(
      `missing "kubesealEndpoint" required option`
    )
  }

  await importSecret({
    manifests,
    options,
    context,
    callback: async ({ secret, namespace, kubectlOptions }) => {
      try {
        await kubectl(`apply -n ${namespace} -f -`, {
          ...kubectlOptions,
          stdin: JSON.stringify(secret),
        })
      } catch (error) {
        logger.error({ error }, "unable to copy kubeconfig secret")
      }
    },
  })
}
