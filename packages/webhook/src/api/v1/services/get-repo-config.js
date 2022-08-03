const loadRemoteConfig = require("~common/config/load-remote-config")
const loadConfig = require("~common/config/load-config")

module.exports =
  () =>
  async ({ remote, repository, gitBranch, gitSha, event, environment }) => {
    let repositoryConfig

    if (remote === undefined) {
      remote = event !== "custom"
    }

    const rootConfig = { git: false, gitSha, environment }

    if (remote) {
      const branchConfig = event === "deleted" ? "HEAD" : gitBranch
      repositoryConfig = await loadRemoteConfig(
        {
          repository,
          ref: branchConfig,
        },
        rootConfig
      )
    } else {
      const options = { repository, branch: gitBranch }
      repositoryConfig = await loadConfig(options, [], rootConfig)
    }

    return repositoryConfig
  }
