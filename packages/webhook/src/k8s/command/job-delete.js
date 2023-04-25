const { ctx } = require("@modjo/core")

const kubectl = require("~/k8s/utils/kubectl")

module.exports = async (namespace, name, kubeconfig) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { surviveOnBrokenCluster } = config.project

  await kubectl(
    `-n ${namespace} delete --ignore-not-found=true jobs.batch ${name}`,
    {
      kubeconfig,
      logger,
      surviveOnBrokenCluster,
    }
  )
}
