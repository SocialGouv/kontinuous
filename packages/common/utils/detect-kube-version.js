const kubectlRetry = require("./kubectl-retry")
const removePrefix = require("./remove-prefix")

module.exports = async (options = {}) => {
  const {
    kubeconfig,
    kubeconfigContext,
    surviveOnBrokenCluster,
    kubectl = kubectlRetry,
  } = options

  let data
  try {
    const output = await kubectl(`version -o json`, {
      kubeconfig,
      kubeconfigContext,
      surviveOnBrokenCluster,
    })
    data = JSON.parse(output)
  } catch (_error) {
    return false
  }
  const { serverVersion } = data
  const { gitVersion } = serverVersion
  const kubeVersion = removePrefix(gitVersion, "v")
  return kubeVersion
}
