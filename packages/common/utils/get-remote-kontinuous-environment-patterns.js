const getRemoteKontinuousConfigFile = require("./get-remote-kontinuous-config-file")
const defaultEnvironmentPatterns = require("./default-environment-patterns")
const defaultLogger = require("./logger")

module.exports = async (
  repositoryUrl,
  ref,
  { logger = defaultLogger } = {}
) => {
  const kontinuousRepoConfig = await getRemoteKontinuousConfigFile(
    repositoryUrl,
    ref,
    { logger }
  )
  return {
    ...defaultEnvironmentPatterns,
    ...(kontinuousRepoConfig.environmentPatterns || {}),
  }
}
