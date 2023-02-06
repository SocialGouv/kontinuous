const importSecret = require("../lib/import-secrets")

module.exports = async (manifests, options, context) => {
  const { logger, kubectl } = context

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
        logger.error({ error }, "unable to copy secret")
      }
    },
  })
}
