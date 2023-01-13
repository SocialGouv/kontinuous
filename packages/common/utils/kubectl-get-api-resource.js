const kubectlRetry = require("./kubectl-retry")

module.exports = async ({ kubectl = kubectlRetry, ...kubectlOptions } = {}) => {
  const apiResourcesOutput = await kubectl(
    "api-resources --namespaced=true --no-headers -o name",
    { logInfo: false, ...kubectlOptions }
  )
  const apiResources = apiResourcesOutput.split("\n").map((res) => res.trim())
  return apiResources
}
