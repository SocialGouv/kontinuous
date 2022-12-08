const getRemoteKontinuousConfigFile = require("../utils/get-remote-kontinuous-config-file")
const loadConfig = require("./load-config")

module.exports = async ({ repository, ref, deployKey }, rootConfig = {}) => {
  const kontinuousRepoConfig = await getRemoteKontinuousConfigFile(
    repository,
    ref,
    { deployKey }
  )
  const options = { repository, branch: ref }
  const repositoryConfig = await loadConfig(
    options,
    [kontinuousRepoConfig],
    rootConfig,
    { loadDependencies: false }
  )
  return repositoryConfig
}
