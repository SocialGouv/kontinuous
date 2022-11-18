const { ctx } = require("@modjo-plugins/core")

const kubectlRetry = require("~common/utils/kubectl-retry")

module.exports = async (manifest, kubeconfig) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { surviveOnBrokenCluster } = config.project
  await kubectlRetry(`apply -f -`, {
    kubeconfig,
    stdin: JSON.stringify(manifest),
    logger,
    surviveOnBrokenCluster,
  })
}
