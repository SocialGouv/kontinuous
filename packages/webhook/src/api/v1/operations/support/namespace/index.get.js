const kubectlRetry = require("~common/utils/kubectl-retry")
const { ctx } = require("@modjo-plugins/core")
const logger = require("~common/utils/logger")

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
      if (kubeconfig === false) {
        return res
          .status(404)
          .json({ message: "kubeconfig for cluster not found" })
      }

      const namespaces = await listNamespaces({ kubeconfig })
      return res.status(200).json({ namespaces })
    },
  ]
}
