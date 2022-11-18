const { ctx } = require("@modjo-plugins/core")

const kubectlRetry = require("~common/utils/kubectl-retry")

module.exports = async (namespace, name, kubeconfig) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { surviveOnBrokenCluster } = config.project

  await kubectlRetry(
    `-n ${namespace} delete --ignore-not-found=true jobs.batch ${name}`,
    {
      kubeconfig,
      logger,
      surviveOnBrokenCluster,
    }
  )
}
