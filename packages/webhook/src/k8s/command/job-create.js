const { ctx } = require("@modjo/core")

const kubectl = require("~/k8s/utils/kubectl")

module.exports = async (manifest, kubeconfig) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { surviveOnBrokenCluster } = config.project
  await kubectl(`apply -f -`, {
    kubeconfig,
    stdin: JSON.stringify(manifest),
    logger,
    surviveOnBrokenCluster,
  })
}
