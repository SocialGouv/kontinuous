const kubectlRetry = require("./kubectl-retry")

module.exports = async (kubectlOptions = {}) => {
  const apiResourcesOutput = await kubectlRetry(
    "api-resources --namespaced=true --no-headers -o name",
    { logInfo: false, ...kubectlOptions }
  )
  const apiResources = apiResourcesOutput.split("\n").map((res) => res.trim())
  return apiResources
}
