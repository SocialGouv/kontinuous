const kubectlRetry = require("~common/utils/kubectl-retry")
const { ctx } = require("@modjo-plugins/core")

async function listNamespaces({ kubeconfig }) {
  const logger = ctx.require("logger")
  logger.debug("getting list of namespaces")
  const json = await kubectlRetry("get namespace -o json", {
    kubeconfig,
    logInfo: false,
    logger,
  })
  const data = JSON.parse(json)
  return data.items.map((ns) => ns.metadata.name)
}

module.exports = function ({ services: { getRootKubeconfig } }) {
  return [
    async (req, res) => {
      const { cluster } = req.query

      const kubeconfig = getRootKubeconfig(cluster)

      try {
        const namespaces = await listNamespaces({ kubeconfig })
        return res.status(200).json({ namespaces })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    },
  ]
}
