const { ctx } = require("@modjo-plugins/core")

const kubectl = require("~/k8s/utils/kubectl")

async function listNamespaces({ kubeconfig }) {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { surviveOnBrokenCluster } = config.project
  logger.debug("getting list of namespaces")
  const json = await kubectl("get namespace -o json", {
    kubeconfig,
    logInfo: false,
    logger,
    surviveOnBrokenCluster,
  })
  const data = JSON.parse(json)
  return data.items.map((ns) => ns.metadata.name)
}

module.exports = function ({ services: { getRootKubeconfig } }) {
  return [
    async (req, res) => {
      const { cluster } = req.query

      const kubeconfig = getRootKubeconfig(cluster)

      const namespaces = await listNamespaces({ kubeconfig })
      return res.status(200).json({ namespaces })
    },
  ]
}
