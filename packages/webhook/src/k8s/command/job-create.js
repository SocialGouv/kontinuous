const { ctx } = require("@modjo-plugins/core")

const kubectlRetry = require("~common/utils/kubectl-retry")

module.exports = async (manifest, kubeconfig) => {
  const logger = ctx.require("logger")
  await kubectlRetry(`apply -f -`, {
    kubeconfig,
    stdin: JSON.stringify(manifest),
    logger,
  })
}
