const getRemoteKontinuousConfigFile = require("../utils/get-remote-kontinuous-config-file")
const loadConfig = require("./load-config")

module.exports = async ({ repository, ref }, rootConfig = {}) => {
  const kontinuousRepoConfig = await getRemoteKontinuousConfigFile(
    repository,
    ref
  )
  const options = { repository, branch: ref }
  const repositoryConfig = await loadConfig(
    options,
    [kontinuousRepoConfig],
    rootConfig
  )
  return repositoryConfig
}
