const deepmerge = require("../utils/deepmerge")

module.exports = (config) => {
  const { organizations, projects, projectName, gitRepositoryName } = config
  if (projects && projects[projectName]) {
    const projectConfig = projects[projectName]
    const { organization } = projectConfig
    if (organization && organizations[organization]) {
      const org = organizations[organization]
      deepmerge(config, org)
    }
    deepmerge(config, projectConfig)
    const repositoryConfig = projectConfig.repositories?.[gitRepositoryName]
    if (repositoryConfig) {
      deepmerge(config, repositoryConfig)
    }
  }
}
